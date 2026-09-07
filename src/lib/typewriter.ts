// Reveals text one character at a time rather than dumping it in all at
// once. Used for both the static greeting (previously appeared instantly)
// and streamed AI responses (network chunks arrive in uneven bursts that
// don't look "typed" on their own) -- push() feeds in whatever text is
// available so far (all of it for the greeting, incrementally for a
// stream), and the reveal rate is independent of how fast it arrives.
export type Typewriter = {
  push: (moreText: string) => void;
  // Call once no more push() calls are coming; resolves/calls onDone once
  // the reveal has caught up with everything pushed so far (immediately,
  // if it already has).
  finish: (onDone?: () => void) => void;
  cancel: () => void;
};

export function createTypewriter(
  onUpdate: (revealedText: string) => void,
  msPerChar = 22
): Typewriter {
  let target = "";
  let shown = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  let streamEnded = false;
  let onCaughtUp: (() => void) | null = null;

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = () => {
    if (shown.length < target.length) {
      shown = target.slice(0, shown.length + 1);
      onUpdate(shown);
      return;
    }
    if (streamEnded) {
      stopTimer();
      onCaughtUp?.();
    }
  };

  const ensureRunning = () => {
    if (!timer) timer = setInterval(tick, msPerChar);
  };

  return {
    push(moreText) {
      target += moreText;
      ensureRunning();
    },
    finish(onDone) {
      streamEnded = true;
      onCaughtUp = onDone ?? null;
      if (shown.length >= target.length) {
        stopTimer();
        onDone?.();
      } else {
        ensureRunning();
      }
    },
    cancel() {
      stopTimer();
    },
  };
}
