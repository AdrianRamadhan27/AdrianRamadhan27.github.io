import { useEffect, useState } from "react";

// Extracted from Computers.tsx's original inline matchMedia listener so
// AvatarExperience can use the identical breakpoint/behavior rather than a
// second hand-rolled copy that could drift out of sync.
export function useIsMobile(breakpointPx: number): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    setIsMobile(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpointPx]);

  return isMobile;
}
