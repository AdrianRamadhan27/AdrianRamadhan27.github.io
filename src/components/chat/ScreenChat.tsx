import { useEffect, useRef, useState } from "react";

import { useChatSession } from "../../hooks/useChatSession";
import type { TChatPublicSettings } from "../../types";

// Shared chat UI: mounted both projected onto the 3D monitor (desktop) and
// as a full-width fallback panel (mobile, where the 3D canvas doesn't render
// at all). Deliberately dependency-free markup so it looks right at any size.
//
// chatPublic is passed in as a prop rather than read via useContent() here
// because the desktop instance is mounted inside drei's <Html>, which
// renders its children into a wholly separate ReactDOM.createRoot() (not a
// portal) -- React context from the surrounding app, including
// ContentContext, never reaches it. The caller (ComputersCanvas) reads
// useContent() itself and threads the value down as a plain prop instead.
//
// The message/streaming state machine itself lives in useChatSession, which
// this and the avatar hero's chat UI both consume -- see that hook for the
// gesture-tag stripping and voice-barge-in cancel support this component
// doesn't use but the avatar one does.
const ScreenChat = ({
  compact = false,
  chatPublic,
}: {
  compact?: boolean;
  chatPublic: TChatPublicSettings;
}) => {
  const { messages, busy, error, send } = useChatSession({
    greeting: chatPublic.greeting,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = () => {
    const text = input;
    setInput("");
    void send(text);
  };

  if (!chatPublic.enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-black p-4 text-center font-mono text-[#00df9a]">
        <p className="text-[13px] opacity-70">// chat offline</p>
        <p className={compact ? "text-[12px]" : "text-[14px]"}>
          The chatbot isn't configured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black font-mono text-[#00df9a]">
      <div
        ref={scrollRef}
        className={`flex-1 space-y-2 overflow-y-auto p-3 ${
          compact ? "text-[13px]" : "text-[11px] leading-tight"
        }`}
      >
        {messages.map((m, i) => (
          <p
            key={i}
            className={`whitespace-pre-wrap break-words ${
              m.role === "user" ? "text-white" : "text-[#00df9a]"
            }`}
          >
            <span className="opacity-60">{m.role === "user" ? "> " : "$ "}</span>
            {m.content}
            {busy && i === messages.length - 1 && m.role === "assistant" && (
              <span className="animate-pulse">▍</span>
            )}
          </p>
        ))}
        {error && <p className="text-red-400">! {error}</p>}
      </div>

      <div
        className="flex gap-2 border-t border-[#00df9a]/30 p-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
          disabled={busy}
          className={`flex-1 bg-transparent text-white outline-none placeholder:text-[#00df9a]/40 ${
            compact ? "text-[13px]" : "text-[11px]"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={busy}
          className="text-[#00df9a]/80 hover:text-[#00df9a] disabled:opacity-40"
        >
          ↵
        </button>
      </div>
    </div>
  );
};

export default ScreenChat;
