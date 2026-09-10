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

// The avatar reads as a man, so the fallback voice should too -- best
// effort, since browser SpeechSynthesis voice control is genuinely
// unreliable in Chromium:
//   * Chrome's "Google UK/US English" voices are NETWORK voices that
//     frequently just never speak (no audio, no error, no events) --
//     reported live: Chrome picked "Google UK English Male" and went
//     silent while Arc, which lacks it, picked the local "Daniel" and
//     spoke. So network voices are excluded outright here.
//   * Even a valid LOCAL voice assigned to utterance.voice is sometimes
//     ignored and the OS default is used instead -- reported live: Arc
//     logged it was using "Daniel" but spoke in the female default.
//     speakWithBrowserTTS also sets utterance.lang to the voice's lang,
//     which makes the assignment stick more often.
// If no reliable male voice is found we return null and let the OS
// default speak -- a working female voice beats a silent male one. The
// bulletproof way to get a male fallback voice is to set the OS/system
// voice to a male one (macOS: System Settings > Accessibility > Spoken
// Content > System Voice).
const PREFERRED_MALE_VOICES = [
  // macOS -- default-installed, local
  "Alex",
  "Daniel",
  "Fred",
  "Aaron",
  "Arthur",
  "Reed",
  "Rishi",
  "Tom",
  "Oliver",
  "Gordon",
  // Windows / Edge -- local
  "Microsoft David",
  "Microsoft Mark",
  "Microsoft Guy",
  "Microsoft Christopher",
  "David",
  "Mark",
  "Guy",
  "James",
  "Ryan",
];
// macOS ships ~30 joke/robot voices -- some read as "male" but sound
// absurd; never pick these.
const NOVELTY_VOICE =
  /\b(albert|bad news|good news|bahh|bells|boing|bubbles|cellos|wobble|jester|organ|superstar|trinoids|whisper|zarvox|deranged|hysterical|pipe organ|flo|grandma|grandpa|rocko|shelley|sandy|junior|ralph)\b/i;
const MALE_VOICE_NAME =
  /\b(male|daniel|alex|fred|arthur|oliver|rishi|george|gordon|james|thomas|david|mark|guy|ryan|aaron|reed|eric|christopher)\b/i;

// Re-read the list every call -- never cache a SpeechSynthesisVoice
// object, Chrome rebuilds that array and a stale object makes speak()
// silently do nothing. LOCAL voices only (see the block comment above on
// why network voices are excluded).
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const local = window.speechSynthesis
    .getVoices()
    .filter((v) => v.localService && !NOVELTY_VOICE.test(v.name));
  if (local.length === 0) return null;

  const english = local.filter((v) => /^en[-_]?/i.test(v.lang));
  const pool = english.length > 0 ? english : local;

  for (const name of PREFERRED_MALE_VOICES) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  return pool.find((v) => MALE_VOICE_NAME.test(v.name)) ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Kick the list into loading (Chrome populates it lazily on first read).
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

// Call this synchronously from a real user-gesture handler. Warms the
// voice list and lifts any earlier pause -- Safari in particular won't
// speak later if synthesis was never touched during a gesture. No
// utterance is spoken (a 0-volume placeholder was tried and only added a
// queued item that raced the real reply).
export function primeBrowserTTS(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.getVoices();
  } catch {
    /* best effort */
  }
}

// Last-resort TTS when the `speak` edge function is unavailable (voice
// disabled server-side, provider error / rate limit, offline). Cannot be
// lip-synced -- SpeechSynthesis output never reaches the Web Audio graph
// (verified during planning) -- so callers should drive an approximate
// mouth flap from `onBoundary` instead of real amplitude.
//
// Logs each step under "[voice]" so a "no sound" report can be diagnosed
// from the console: how many voices exist, which one was chosen, whether
// it actually started, and any error code.
export function speakWithBrowserTTS(text: string, onBoundary?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Browser speech synthesis is unavailable."));
      return;
    }
    const synth = window.speechSynthesis;
    // cancel() + resume() before speaking: Chrome's speech engine wedges
    // (speaking === true, utterances queue, nothing plays, no events) and
    // a cancel is the documented way to clear it. `interrupted`/`canceled`
    // errors are treated as clean below, so this is safe even mid-reply.
    synth.cancel();
    synth.resume();

    const voiceList = synth.getVoices();
    console.info(
      `[voice] browser fallback starting -- ${voiceList.length} voice(s)` +
        (voiceList.length === 0
          ? " -- speechSynthesis has NO voices on this device, it cannot speak"
          : ` (OS default: ${voiceList.find((v) => v.default)?.name ?? "unknown"})`)
    );

    let settled = false;
    let attempt = -1; // 0 = preferred male voice, 1 = OS default (no voice)
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let keepAlive: ReturnType<typeof setInterval> | undefined;

    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      if (keepAlive) clearInterval(keepAlive);
      if (err) {
        console.warn("[voice] browser fallback failed:", err.message);
        reject(err);
      } else {
        console.info("[voice] browser fallback done");
        resolve();
      }
    };

    const tryAttempt = (n: number) => {
      if (settled) return;
      attempt = n;
      if (watchdog) clearTimeout(watchdog);

      const u = new SpeechSynthesisUtterance(text);
      if (n === 0) {
        const v = pickBrowserVoice();
        if (v) {
          u.voice = v;
          u.lang = v.lang; // Chromium honours utterance.voice more reliably with a matching lang
          console.info(
            `[voice] attempt 0: "${v.name}" (${v.lang}, ${v.localService ? "local" : "network"})`
          );
        } else {
          console.info("[voice] attempt 0: no male voice found -- using OS default");
        }
      } else {
        console.info("[voice] attempt 1: OS default voice (no override)");
      }

      let onstartFired = false;
      u.onstart = () => {
        if (settled || attempt !== n) return;
        onstartFired = true;
        if (watchdog) clearTimeout(watchdog);
        console.info("[voice] speaking");
        // Chrome silently pauses utterances after ~15s -- keep nudging.
        keepAlive = setInterval(() => synth.resume(), 8000);
      };
      u.onboundary = () => onBoundary?.();
      u.onend = () => {
        if (attempt === n) done();
      };
      u.onerror = (e) => {
        if (settled || attempt !== n) return;
        if (e.error === "interrupted" || e.error === "canceled") {
          done(); // a newer reply / a mute stopped us -- clean end
          return;
        }
        if (n === 0) {
          if (keepAlive) clearInterval(keepAlive);
          tryAttempt(1);
        } else {
          done(new Error(e.error || "speech synthesis error"));
        }
      };

      synth.speak(u);

      // Watchdog keyed on onstart, NOT synth.speaking -- when Chrome is
      // wedged, synth.speaking reads true while nothing plays and no
      // onstart ever fires. If onstart hasn't fired shortly, move on.
      watchdog = setTimeout(() => {
        if (settled || attempt !== n || onstartFired) return;
        console.warn(
          `[voice] attempt ${n} never started (speaking=${synth.speaking} pending=${synth.pending}) -- ` +
            (n === 0 ? "falling back to OS default" : "giving up")
        );
        if (keepAlive) clearInterval(keepAlive);
        synth.cancel();
        synth.cancel(); // double cancel: known unwedge trick
        if (n === 0) {
          setTimeout(() => tryAttempt(1), 50);
        } else {
          done(new Error("speechSynthesis produced no audio -- browser TTS is not working on this device"));
        }
      }, n === 0 ? 1200 : 2000);
    };

    tryAttempt(0);
  });
}

export function isBrowserTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
