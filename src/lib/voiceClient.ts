// Client for the two voice edge functions (`speak`, `transcribe`) plus
// browser-native fallbacks, mirroring chatClient.ts's error-parsing
// conventions (edge functions here return the same `{ error: string }`
// shape on failure).

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

// POSTs text to the `speak` edge function (OpenRouter /audio/speech under
// the hood) and returns the raw audio bytes. Callers should play this via
// a Blob URL, never the response's own URL -- see LipsyncDriver in
// lipsync.ts for why (createMediaElementSource taints on cross-origin audio).
export async function synthesizeSpeech(
  text: string,
  opts: { signal?: AbortSignal } = {}
): Promise<Blob> {
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
  if (!res.ok) {
    throw new Error(await parseErrorBody(res, "Text-to-speech is unavailable right now."));
  }
  return res.blob();
}

// POSTs recorded audio to the `transcribe` edge function (OpenRouter
// /audio/transcriptions) and returns the recognized text. Used as the
// fallback STT path on browsers without SpeechRecognition (Firefox) or
// when SpeechRecognition itself errors out.
export async function transcribeAudio(
  blob: Blob,
  opts: { signal?: AbortSignal } = {}
): Promise<string> {
  const { url, anonKey } = requireSupabaseEnv();
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  const res = await fetch(`${url}/functions/v1/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: form,
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res, "Speech recognition is unavailable right now."));
  }
  const json = await res.json();
  return typeof json.text === "string" ? json.text : "";
}

// --- Browser-native fallbacks -------------------------------------------

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

// Chrome/Edge/Safari ship this under a vendor prefix; Firefox doesn't ship
// it at all by default (verified during planning) -- feature-detect rather
// than assume.
export function getBrowserSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// One-shot: starts listening, resolves with the recognized text on the
// first final result, rejects on error/no-speech. Simpler than exposing
// interim results for a portfolio chatbot's needs.
export function listenOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getBrowserSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Speech recognition is not supported in this browser."));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: unknown) => {
      const results = (event as { results?: { transcript: string }[][] }).results;
      const transcript = results?.[0]?.[0]?.transcript ?? "";
      resolve(transcript);
    };
    recognition.onerror = (event: unknown) => {
      const error = (event as { error?: string }).error ?? "unknown";
      reject(new Error(`Speech recognition error: ${error}`));
    };
    recognition.onend = () => {
      // If onresult never fired (silence/timeout) the promise is still
      // pending -- resolve with an empty string rather than hanging.
      resolve("");
    };
    recognition.start();
  });
}

export function isBrowserSpeechRecognitionAvailable(): boolean {
  return getBrowserSpeechRecognitionCtor() !== null;
}

export type ActiveRecording = {
  /** Stop early (e.g. mic button released) rather than waiting for the cap. */
  stop: () => void;
  result: Promise<Blob>;
};

// Records from the microphone for a bounded duration via MediaRecorder --
// the fallback capture path on browsers without SpeechRecognition, feeding
// transcribeAudio() above. Returns immediately with a stop handle; `result`
// resolves once stopped (by the caller or the duration cap).
export async function recordAudio(maxDurationMs = 8000): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  const result = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error("Recording failed."));
    };
  });

  const stop = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  recorder.start();
  const timer = setTimeout(stop, maxDurationMs);
  result.finally(() => clearTimeout(timer));

  return { stop, result };
}

// Last-resort TTS when the `speak` edge function is unavailable (voice
// disabled server-side, provider error, offline). Cannot be lip-synced --
// SpeechSynthesis output never reaches the Web Audio graph (verified
// during planning; see plan file) -- so callers should drive an
// approximate mouth flap from `onBoundary` instead of real amplitude.
export function speakWithBrowserTTS(
  text: string,
  onBoundary?: () => void
): Promise<void> {
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
