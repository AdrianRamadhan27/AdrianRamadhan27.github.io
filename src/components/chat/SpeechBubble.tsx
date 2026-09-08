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
}: {
  text: string;
  busy: boolean;
  error: string | null;
}) => {
  if (!text && !busy && !error) return null;

  return (
    <div className="border-accent/30 bg-tertiary/90 max-w-sm rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm">
      {error ? (
        <p className="text-[13px] text-red-400">! {error}</p>
      ) : (
        <p className="text-[14px] leading-snug whitespace-pre-wrap text-white">
          {text}
          {busy && <span className="text-accent animate-pulse">▍</span>}
        </p>
      )}
    </div>
  );
};

export default SpeechBubble;
