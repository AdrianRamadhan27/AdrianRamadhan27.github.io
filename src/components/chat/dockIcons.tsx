// Small shared icons for the floating docked "assistant" widget (both
// AvatarExperience and ComputersCanvas use these for their minimize <->
// reopen toggle) -- kept in one place so the two don't drift.

export const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V5Z"
      fill="currentColor"
    />
  </svg>
);

export const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M5 8l7 7 7-7"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
