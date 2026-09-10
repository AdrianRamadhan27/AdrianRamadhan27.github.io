import type { ChatStatus } from "../../lib/chatClient";

// Minimal floating reply bubble for the avatar hero -- the avatar has no
// monitor to project a terminal onto, so the conversation surfaces here
// instead (see ChatInputBar for the input side). Only ever shows the most
// recent assistant message; older turns aren't visible, which is
// deliberate for a glanceable, speech-first interaction rather than a
// scrollable transcript.
const SpeechBubble = ({
  text,
  busy,
  error,
  status,
  onClose,
  // Narrow, shrink-to-content by default (the docked floating widget wants
  // this -- the bubble sits snug next to the avatar crop there, not
  // spanning the whole compact widget). The in-hero layouts pass "w-full"
  // instead so the bubble stretches to match the input bar's own width
  // sitting right below it, rather than floating narrower and misaligned.
  widthClassName = "max-w-sm",
}: {
  text: string;
  busy: boolean;
  error: string | null;
  /** "Thinking" / "Looking up …" line shown while a reply is being worked
   *  on and no visible text has arrived yet (see useChatSession). */
  status?: ChatStatus | null;
  /** When provided, renders a hide button -- the in-hero bubble uses this
   *  so a long reply can be dismissed instead of covering the hero. */
  onClose?: () => void;
  widthClassName?: string;
}) => {
  if (!text && !busy && !error) return null;

  const showStatus = busy && !text && !error && status;

  return (
    <div
      className={`border-accent/25 bg-tertiary/55 ${widthClassName} relative rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md`}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide message"
          className="text-secondary hover:text-accent hover:bg-tertiary absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-accent/25 bg-tertiary/90 backdrop-blur-md transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {error ? (
        <p className="pr-4 text-[13px] text-red-400">! {error}</p>
      ) : showStatus ? (
        <p className="text-secondary flex items-center gap-2 pr-4 text-[13px]">
          <span className="bg-accent h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full" />
          <span>
            {status.label}
            <span className="animate-pulse">…</span>
          </span>
        </p>
      ) : (
        <p className="whitespace-pre-wrap pr-4 text-[14px] leading-snug text-white">
          {text}
          {busy && <span className="text-accent animate-pulse">▍</span>}
        </p>
      )}
    </div>
  );
};

export default SpeechBubble;
