import { useState } from "react";

// Text input, for the avatar hero (paired with SpeechBubble for the reply
// side). Kept separate from ScreenChat's own input row since that one's
// terminal-styled and lives inside drei's <Html> constraints; this one is
// normal DOM with normal styling. No microphone -- text input only.
const ChatInputBar = ({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) => {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    setValue("");
    onSend(text);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Ask me anything…"
        disabled={disabled}
        // min-w-0: flex items default to min-width:auto, which for a text
        // input means it won't shrink below its intrinsic content-based
        // width no matter how little room flex-1 actually gives it --
        // exactly what was overflowing the send button off a narrow
        // container instead of shrinking to fit.
        className="border-accent/30 bg-tertiary/80 text-secondary focus:border-accent min-w-0 flex-1 rounded-full border px-4 py-2 text-[14px] text-white outline-none placeholder:text-white/30"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-label="Send"
        className="bg-accent hover:bg-accent-dim flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black transition-colors disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="ml-[-1px] h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M3 11.5L20 4L12.5 21L10.5 13.5L3 11.5Z"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinejoin="round"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
};

export default ChatInputBar;
