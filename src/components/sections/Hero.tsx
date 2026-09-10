import React, { useEffect, useRef, useState } from "react";

import { styles } from "../../constants/styles";
import { ComputersCanvas, AvatarExperience } from "../canvas";
import { useContent } from "../../hooks/useContent";
import CvModal from "../ui/CvModal";
import HeroSocialEmbeds from "../atoms/HeroSocialEmbeds";
import HeroStats from "../atoms/HeroStats";

const Hero = () => {
  const { profile, loading, chatPublic } = useContent();
  const [cvOpen, setCvOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  // True once this section has scrolled fully out of view -- flips the
  // avatar/computer + chat UI from its normal in-hero layout to a small
  // fixed bottom-right "assistant" widget (see the `docked` prop on
  // AvatarExperience/ComputersCanvas) so it stays reachable while browsing
  // the rest of the page, then reverts once the visitor scrolls back up.
  // IntersectionObserver over a scroll listener: cheaper (no per-scroll-
  // event JS at all, the browser only calls back on actual visibility
  // transitions) and threshold 0 means "docked" flips true only once ZERO
  // pixels of the hero remain on screen, matching "scroll past" literally
  // rather than as soon as it starts leaving.
  const [docked, setDocked] = useState(false);

  // Anchors the avatar/photo flip card (rendered in the sibling
  // AvatarExperience, a separate component for chat-state reasons) to the
  // hero text on its left: its top lines up with the top of the subtext
  // line, its bottom with the bottom of the stats card, and its right
  // edge with the end of the name. Those three are laid out by flex/margin
  // flow and their exact pixel positions depend on font metrics, viewport
  // width and how the name wraps, so there's no static top/right/height to
  // hardcode -- measure them against the section box and hand the result
  // to the card as CSS custom properties (it falls back to rough
  // percentages until this first runs). Desktop only; below sm the hero
  // is a normal-flow stack with its own layout.
  const subTextRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const statsWrapRef = useRef<HTMLDivElement>(null);
  const socialWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const measure = () => {
      const p = subTextRef.current;
      const name = nameRef.current;
      if (!p || !name) return;
      const s = section.getBoundingClientRect();
      const pr = p.getBoundingClientRect();
      const nr = name.getBoundingClientRect();
      // Prefer the stats card's bottom; if the CMS has no stats numbers
      // set, HeroStats renders nothing (zero-height wrapper) -- fall back
      // to the social embeds' bottom so the card still has a real anchor.
      const stats = statsWrapRef.current;
      const bottomEl =
        stats && stats.getBoundingClientRect().height > 4
          ? stats
          : socialWrapRef.current;
      const bottom = (bottomEl?.getBoundingClientRect().bottom ?? pr.bottom) - s.top;
      const top = pr.top - s.top;

      section.style.setProperty("--hero-photo-top", `${Math.round(top)}px`);
      section.style.setProperty("--hero-photo-height", `${Math.round(bottom - top)}px`);
      section.style.setProperty(
        "--hero-photo-right-gap",
        `${Math.round(s.width - (nr.right - s.left))}px`
      );
    };

    measure();
    // Fonts finishing loading reflows the head/subtext after first paint.
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    const col = subTextRef.current?.parentElement;
    if (col) ro.observe(col);
    return () => ro.disconnect();
  }, [
    loading,
    profile.fullName,
    profile.heroLines,
    profile.yearsExperience,
    profile.projectsDone,
  ]);

  // min-h-screen alone lets mobile content (text + stacked chat panel) grow
  // taller than one viewport, but r3f's Canvas sizes itself via CSS
  // height:100%, which needs a *definite* parent height -- min-height
  // doesn't count, so at sm+ (where the canvas actually renders) this
  // reverts to a fixed h-screen or the canvas collapses/mispositions.
  return (
    <section ref={sectionRef} className={`relative mx-auto min-h-screen w-full sm:h-screen`}>
      {/* Below the sm breakpoint there is no 3D canvas at all (see
          ComputersCanvas) -- just a normal-flow chat panel underneath, so
          this block is normal-flow too (pt-28 clears the fixed navbar) and
          stacks cleanly above it. At sm+ it switches to absolute+inset-0,
          overlaying the canvas -- pointer-events-none there lets clicks
          everywhere but the CV button fall through for OrbitControls
          dragging (z-10 keeps it visually on top; the button opts back in
          with pointer-events-auto). */}
      <div
        className={`relative z-10 mx-auto max-w-7xl pb-8 pt-28 sm:pointer-events-none sm:absolute sm:inset-0 sm:top-[120px] sm:pb-0 sm:pt-0 ${styles.paddingX} flex flex-row items-start gap-5`}
      >
        <div className="mt-5 flex flex-col items-center justify-center">
          <div className="bg-accent h-5 w-5 rounded-full" />
          <div className="accent-gradient h-40 w-1 sm:h-80" />
        </div>

        {/* min-w-0: this is a flex item in the row above, and its default
            min-width:auto refuses to shrink below its own content's
            natural width -- HeroSocialEmbeds' GitHub card carries a
            genuinely wide contribution-chart image (min-w-[500px], scoped
            to scroll within its own overflow-x-auto wrapper), and without
            this override that wide min-content bubbles up and pushes this
            whole column past the mobile viewport's edge instead of being
            contained by that inner scroll area. Same root cause as the
            chat input's own min-w-0 fix elsewhere in this codebase. */}
        <div className="min-w-0">
          {/* Gated on loading, not just "does profile have data yet" --
              profile starts out holding the bundled fallback constants
              (so other, non-Supabase-dependent parts of the page never
              render empty), which used to mean this showed that fallback
              text immediately, then visibly swapped to the real DB content
              a moment later. Skeleton until the fetch actually settles
              (success or failure) removes that flash of wrong-then-right
              text entirely -- once loading is false, whatever profile
              resolved to (real data, or the fallback if the fetch
              ultimately failed) renders normally. */}
          {loading ? (
            // Fixed pixel widths, not percentages: this div is a flex item
            // that would otherwise shrink-to-fit its content (there's no
            // text here to size against, unlike the real h1/p), so a
            // percentage-width child has no definite parent width to
            // resolve against and collapses to 0.
            <div aria-hidden className="animate-pulse">
              <div className="h-[40px] w-[220px] rounded-lg bg-white/10 xs:h-[50px] xs:w-[300px] sm:h-[60px] sm:w-[420px] lg:h-[80px] lg:w-[560px]" />
              <div className="mt-4 space-y-2">
                <div className="h-[16px] w-[240px] rounded bg-white/10 xs:h-[20px] xs:w-[320px] sm:h-[26px] sm:w-[380px] lg:h-[30px] lg:w-[420px]" />
                <div className="h-[16px] w-[200px] rounded bg-white/10 xs:h-[20px] xs:w-[280px] sm:h-[26px] sm:w-[340px] lg:h-[30px] lg:w-[380px]" />
              </div>
            </div>
          ) : (
            <>
              <h1 className={`${styles.heroHeadText} text-white`}>
                Hi, I'm{" "}
                <span ref={nameRef} className="text-accent">
                  {profile.fullName}
                </span>
              </h1>
              <p ref={subTextRef} className={`${styles.heroSubText} text-white-100 mt-2`}>
                {profile.heroLines.map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < profile.heroLines.length - 1 && (
                      <br className="hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </p>
            </>
          )}

          {!loading && profile.cvUrl && (
            <button
              onClick={() => setCvOpen(true)}
              className="bg-accent hover:bg-accent-dim pointer-events-auto mt-6 inline-block rounded-full px-6 py-3 text-[14px] font-bold text-black transition-colors"
            >
              View CV
            </button>
          )}

          {!loading && (
            <div ref={socialWrapRef}>
              <HeroSocialEmbeds className="mt-5" />
            </div>
          )}

          {!loading && (
            <div ref={statsWrapRef}>
              <HeroStats />
            </div>
          )}
        </div>
      </div>

      {chatPublic.heroVariant === "avatar" ? (
        <AvatarExperience docked={docked} />
      ) : (
        <ComputersCanvas docked={docked} />
      )}

      {cvOpen && profile.cvUrl && (
        <CvModal url={profile.cvUrl} onClose={() => setCvOpen(false)} />
      )}
    </section>
  );
};

export default Hero;
