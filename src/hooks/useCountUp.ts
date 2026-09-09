import { useEffect, useRef, useState } from "react";

// "0, 1, 2, 3... really fast, like the number is going up" -- animates
// from 0 to `target` once per mount / per `target` change via
// requestAnimationFrame, eased so it starts fast and settles rather than
// a flat linear count (reads as more of a "counter ticking up" than a
// metronome). 900ms is "really fast" for a 1-2 digit number while still
// being long enough to actually read as counting rather than a flicker.
const DEFAULT_DURATION_MS = 900;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, durationMs = DEFAULT_DURATION_MS) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Respects the OS-level "reduce motion" setting -- jumps straight to
    // the final number instead of animating for anyone who's asked
    // system-wide for less motion, rather than forcing this on everyone.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    setValue(0);
    startRef.current = null;
    let raf = 0;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
