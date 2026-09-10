// Client for the `speak` edge function (OpenRouter /audio/speech under the
// hood), mirroring chatClient.ts's error-parsing conventions (the edge
// function returns the same `{ error: string }` shape on failure).
//
// No speech-to-text here by design -- the mic/transcribe feature was
// removed. Voice is TTS-only: the avatar speaks its replies, typed input
// is the only way to talk to it.

async function parseErrorBody(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text).error ?? fallback;
  } catch {
    return fallback;
  }
}

function requireSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

// Streams the synthesized-speech MP3 bytes for `text` from the `speak`
// edge function, calling onChunk with each Uint8Array as it arrives --
// doesn't wait for the full reply to finish generating before the caller
// can start playing it (see src/lib/audioStreamPlayer.ts, which is what
// actually decodes/plays these chunks).
export async function streamSpeech(
  text: string,
  onChunk: (bytes: Uint8Array) => void,
  opts: { signal?: AbortSignal } = {}
): Promise<void> {
  const { url, anonKey } = requireSupabaseEnv();
  const res = await fetch(`${url}/functions/v1/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ text }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(await parseErrorBody(res, "Text-to-speech is unavailable right now."));
  }

  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    if (value && value.length > 0) onChunk(value);
  }
}

// The avatar reads as a man, so the fallback voice should too. Browsers
// expose no gender field, so this goes by name: a priority list of the
// natural-sounding male voices bundled with macOS / Windows / Chrome /
// Android first, then any voice whose name otherwise looks male, English
// throughout. getVoices() is often empty on the first call (the list
// loads async) -- the voiceschanged listener below re-runs the pick, and
// until it resolves speakWithBrowserTTS just lets the browser use its
// own default for that one utterance.
const PREFERRED_MALE_VOICES = [
  "Google UK English Male",
  "Google US English Male",
  "Alex", // macOS, the good natural one
  "Daniel",
  "Rishi",
  "Aaron",
  "Arthur",
  "Reed",
  "Tom",
  "Oliver",
  "Gordon",
  "David", // Windows
  "Mark",
  "Guy",
  "Christopher",
  "Eric",
  "Ryan",
  "James",
];
// macOS ships ~30 joke/robot voices (Albert, Bad News, Bubbles, Zarvox…)
// -- some read as "male" but sound absurd; never pick these.
const NOVELTY_VOICE =
  /\b(albert|bad news|good news|bahh|bells|boing|bubbles|cellos|wobble|jester|organ|superstar|trinoids|whisper|zarvox|deranged|hysterical|pipe organ|flo|grandma|grandpa|rocko|shelley|sandy)\b/i;
const MALE_VOICE_NAME =
  /\b(male|daniel|alex|fred|arthur|oliver|rishi|george|gordon|james|thomas|david|mark|guy|ryan|aaron|reed)\b/i;

let cachedBrowserVoice: SpeechSynthesisVoice | null | undefined;

function pickBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedBrowserVoice !== undefined) return cachedBrowserVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet

  const usable = voices.filter((v) => !NOVELTY_VOICE.test(v.name));
  const english = usable.filter((v) => /^en[-_]?/i.test(v.lang));
  const pool = english.length > 0 ? english : usable;

  for (const name of PREFERRED_MALE_VOICES) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return (cachedBrowserVoice = hit);
  }
  // null -> keep the browser default rather than force an odd/female one.
  return (cachedBrowserVoice = pool.find((v) => MALE_VOICE_NAME.test(v.name)) ?? null);
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedBrowserVoice = undefined;
    pickBrowserVoice();
  });
  // Kick the list into loading (Chrome populates it lazily on first read).
  pickBrowserVoice();
}

// Last-resort TTS when the `speak` edge function is unavailable (voice
// disabled server-side, provider error / rate limit, offline). Cannot be
// lip-synced -- SpeechSynthesis output never reaches the Web Audio graph
// (verified during planning) -- so callers should drive an approximate
// mouth flap from `onBoundary` instead of real amplitude.
export function speakWithBrowserTTS(text: string, onBoundary?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Browser speech synthesis is unavailable."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickBrowserVoice();
    if (voice) utterance.voice = voice;
    utterance.onboundary = () => onBoundary?.();
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(e.error || "Speech synthesis failed."));
    window.speechSynthesis.speak(utterance);
  });
}

export function isBrowserTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
