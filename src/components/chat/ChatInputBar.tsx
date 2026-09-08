import { useState } from "react";

import MicButton from "./MicButton";

// Text input + mic, for the avatar hero (paired with SpeechBubble for the
// reply side). Kept separate from ScreenChat's own input row since that
// one's terminal-styled and lives inside drei's <Html> constraints; this
// one is normal DOM with normal styling.
const ChatInputBar = ({
  onSend,
  disabled,
  voiceEnabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  voiceEnabled: boolean;
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
      {voiceEnabled && (
        <MicButton
          disabled={disabled}
          onTranscript={(text) => {
            // Speak-to-send: a recognized transcript sends immediately
            // rather than just filling the box, matching how voice
            // assistants generally behave (typing is the "review before
            // sending" path; talking is the "just ask" path).
            onSend(text);
          }}
        />
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Ask me anything…"
        disabled={disabled}
        className="border-accent/30 bg-tertiary/80 text-secondary focus:border-accent flex-1 rounded-full border px-4 py-2 text-[14px] text-white outline-none placeholder:text-white/30"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="bg-accent hover:bg-accent-dim rounded-full px-4 py-2 text-[13px] font-bold text-black transition-colors disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
};

export default ChatInputBar;
