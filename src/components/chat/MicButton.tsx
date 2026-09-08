import { useRef, useState } from "react";

import {
  isBrowserSpeechRecognitionAvailable,
  listenOnce,
  recordAudio,
  transcribeAudio,
  type ActiveRecording,
} from "../../lib/voiceClient";

type Status = "idle" | "listening" | "transcribing" | "error";

// Click-to-talk (not push-to-talk): one click starts listening, a second
// click (or the browser's own end-of-speech detection) stops it. Prefers
// the browser's native SpeechRecognition when available (free, instant,
// Chrome/Edge/Safari) and falls back to MediaRecorder + the `transcribe`
// edge function (OpenRouter STT) otherwise -- chiefly Firefox, which
// doesn't ship SpeechRecognition by default (verified during planning).
const MicButton = ({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const recordingRef = useRef<ActiveRecording | null>(null);
  const nativeAvailable = isBrowserSpeechRecognitionAvailable();

  const startNative = async () => {
    setStatus("listening");
    try {
      const text = await listenOnce();
      setStatus("idle");
      if (text.trim()) onTranscript(text.trim());
    } catch (e) {
      setStatus("error");
      // Surfaced status alone ("Mic error" pip) doesn't carry a reason;
      // worth having in devtools.
      console.error(e);
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const startFallback = async () => {
    setStatus("listening");
    try {
      const recording = await recordAudio(8000);
      recordingRef.current = recording;
      const blob = await recording.result;
      recordingRef.current = null;
      setStatus("transcribing");
      const text = await transcribeAudio(blob);
      setStatus("idle");
      if (text.trim()) onTranscript(text.trim());
    } catch (e) {
      setStatus("error");
      console.error(e);
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const handleClick = () => {
    if (status === "listening") {
      recordingRef.current?.stop();
      return;
    }
    if (status !== "idle") return;
    void (nativeAvailable ? startNative() : startFallback());
  };

  const label =
    status === "listening"
      ? "Listening… click to stop"
      : status === "transcribing"
        ? "Transcribing…"
        : status === "error"
          ? "Mic error"
          : "Talk";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || status === "transcribing"}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
        status === "listening"
          ? "border-accent bg-accent animate-pulse text-black"
          : "border-accent/40 text-accent hover:border-accent hover:bg-accent/10"
      } disabled:opacity-40`}
    >
      {/* Simple mic glyph -- no icon dependency beyond react-icons already
          used elsewhere; kept inline to avoid a new import for one glyph. */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19 11a7 7 0 0 1-14 0M12 18v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
};

export default MicButton;
