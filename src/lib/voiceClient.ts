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

// Last-resort TTS when the `speak` edge function is unavailable (voice
// disabled server-side, provider error, offline). Cannot be lip-synced --
// SpeechSynthesis output never reaches the Web Audio graph (verified
// during planning) -- so callers should drive an approximate mouth flap
// from `onBoundary` instead of real amplitude.
export function speakWithBrowserTTS(text: string, onBoundary?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Browser speech synthesis is unavailable."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onboundary = () => onBoundary?.();
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(e.error || "Speech synthesis failed."));
    window.speechSynthesis.speak(utterance);
  });
}

export function isBrowserTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
