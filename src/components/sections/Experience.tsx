import React, { useEffect, useRef } from "react";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";

import "react-vertical-timeline-component/style.min.css";

import { SectionWrapper } from "../../hoc";
import { Header } from "../atoms/Header";
import { TExperience } from "../../types";
import { config } from "../../constants/config";
import { useContent } from "../../hooks/useContent";

// How many arrows climb the timeline's line at once, and how long one
// arrow's full rise-and-loop takes -- kept in sync with globals.css's own
// `.timeline-progress-arrow { animation: timeline-arrow-rise 4.5s ... }`
// duration, since the even spacing below is computed from it (duration /
// count = the gap between each arrow's animation-delay, so five arrows
// spread evenly across one full cycle read as a continuous queue rather
// than a single arrow -- see the Experience component's own comment on
// this for why it can't just be one).
const ARROW_QUEUE_COUNT = 5;
const ARROW_RISE_DURATION_S = 4.5;

const ExperienceCard: React.FC<TExperience & { isLast: boolean }> = ({
  isLast,
  ...experience
}) => {
  return (
    <VerticalTimelineElement
      contentStyle={{
        // No `background` here anymore -- .timeline-card-glow (below)
        // handles it now, via a background-clip trick that needs to own
        // the property outright (see that class's comment in globals.css
        // for why: an inline style's background would otherwise always
        // beat anything the stylesheet tries to layer in behind it).
        color: "#fff",
      }}
      contentArrowStyle={{ borderRight: "7px solid  #0a1712" }}
      // Static class (drives the plain :hover trigger in globals.css) --
      // Experience.tsx's own IntersectionObserver additionally toggles
      // "is-centered" directly on this same DOM node (classList, not
      // through this prop) once it's mounted, since the library exposes
      // no ref to it for us to drive that reactively instead.
      textClassName="timeline-card-glow"
      // Keeps the company logo painting above the queued arrows climbing
      // the line behind it (see .timeline-icon-front in globals.css).
      iconClassName="timeline-icon-front"
      // Repositions the date to the top of the opposite-side column
      // instead of the library's own spot (which .timeline-experience-photo
      // would otherwise cover) -- see .timeline-date in globals.css.
      dateClassName="timeline-date"
      // The OUTER element -- the one ancestor .timeline-card-glow (the
      // content box) and the icon circle both sit under -- so
      // :has(.timeline-card-glow:hover) in globals.css can glow the line
      // segment and logo circle together whenever the card itself is
      // hovered/centered (see .timeline-job-glow's comment there).
      //
      // isLast is passed explicitly rather than targeted via a :last-child
      // CSS selector -- the 5 queued-arrow divs (below) render AFTER every
      // card as later siblings under the same <VerticalTimeline>, so the
      // true last DOM child is always one of those, never the last actual
      // job; :last-child (and :last-of-type, since they're plain divs too)
      // would silently never match any card at all.
      className={`timeline-job-glow${isLast ? " timeline-job-glow--last" : ""}`}
      date={experience.date}
      iconStyle={{ background: experience.iconBg }}
      icon={
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={experience.icon}
            alt={experience.companyName}
            className="h-[60%] w-[60%] object-contain"
          />
        </div>
      }
    >
      <div>
        <h3 className="text-[24px] font-bold text-white">{experience.title}</h3>
        <p
          className="text-secondary text-[16px] font-semibold"
          style={{ margin: 0 }}
        >
          {experience.companyName}
        </p>
      </div>

      <ul className="ml-5 mt-5 list-disc space-y-2">
        {experience.points.map((point, index) => (
          <li
            key={`experience-point-${index}`}
            className="text-white-100 pl-1 text-[14px] tracking-wider"
          >
            {point}
          </li>
        ))}
      </ul>

      {/* The arrow marker that circles this card's outline (see
          .timeline-card-orbit's comment in globals.css for how
          offset-path makes it trace the card's own border, rounded
          corners included, rather than a plain rectangle guess). Renders
          inside .timeline-card-glow (this whole block IS that element's
          children, per VerticalTimelineElement's own source) so its
          inset:-3px lines up exactly with that element's real border. */}
      <div className="timeline-card-orbit" aria-hidden>
        <div className="timeline-card-orbit-icon">
          <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
            <path
              d="M4 12h15M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Optional opposite-side photo -- reuses .timeline-card-glow
          wholesale (border/background + the orbiting arrow above) so it
          gets the exact same hover/is-centered treatment as the
          description card itself, not a lookalike copy of it. Positioning
          (which side, and normal-flow-below vs absolute-beside) lives
          entirely in globals.css's .timeline-experience-photo -- see its
          comment for why it can be a plain child here despite ending up
          visually outside this card's own box. */}
      {experience.photo && (
        <div className="timeline-experience-photo timeline-card-glow">
          <img
            src={experience.photo}
            alt={`${experience.companyName} team`}
            className="h-full w-full rounded-[0.25em] object-cover"
          />
          <div className="timeline-card-orbit" aria-hidden>
            <div className="timeline-card-orbit-icon">
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                <path
                  d="M4 12h15M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </VerticalTimelineElement>
  );
};

const Experience = () => {
  const { experiences } = useContent();
  const containerRef = useRef<HTMLDivElement>(null);

  // "Centered in viewport" -- react-vertical-timeline-component's own
  // internal InView (used for its bounce-in reveal) only checks "has this
  // scrolled into view at all", not "is this the one currently in the
  // middle of the screen", and doesn't expose that state to us anyway.
  // Runs once per experiences list change (not per card) via a single
  // observer watching every .timeline-card-glow node found under this
  // section -- cheaper than one observer per card, and the DOM order of
  // that query always matches render order regardless of how many there
  // are.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".timeline-card-glow")
    );
    if (cards.length === 0) return;

    // A thin horizontal band through the vertical middle of the viewport
    // -- a card is "centered" only while it overlaps that band, not
    // merely "somewhere on screen" (the default any-visibility check).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-centered", entry.isIntersecting);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [experiences]);

  // Keeps a row (.vertical-timeline-element, i.e. .timeline-job-glow) tall
  // enough for BOTH of its columns -- the description card, and the
  // date+photo column beside it -- not just the card. The card is the
  // row's only normal-flow child (the icon and .timeline-experience-photo
  // are both position:absolute, see globals.css), so the row's natural
  // height only ever came from the card; when the photo column was taller
  // than the card, it silently overflowed past the row's own bottom edge
  // into the NEXT row's space instead of pushing that next row down.
  //
  // Plain min-height, not a CSS-only fit-content trick -- the photo
  // column's real height depends on the photo's fluid width (matches the
  // card's own responsive width) plus the date's own text-driven height,
  // a mix of fixed and fluid parts no single CSS aspect-ratio/calc()
  // expression captures correctly at every viewport width; measuring the
  // actual rendered boxes and taking whichever is taller is exact instead
  // of an approximation. Skips rows with no photo entirely (photo-less
  // rows already size correctly from the card alone, nothing to fix).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>(".timeline-job-glow")
    )
      .map((row) => ({
        row,
        content: row.querySelector<HTMLElement>(
          ".vertical-timeline-element-content"
        ),
        photo: row.querySelector<HTMLElement>(".timeline-experience-photo"),
      }))
      .filter(
        (
          r
        ): r is { row: HTMLElement; content: HTMLElement; photo: HTMLElement } =>
          !!r.content && !!r.photo
      );
    if (rows.length === 0) return;

    const recalc = () => {
      // Reset pass BEFORE measuring, separate from the measure pass below
      // -- rows stack vertically, so shrinking an earlier row mid-loop
      // would shift every later row's own measured position, contaminating
      // their numbers. Clearing every row first, then measuring only once
      // everything is back to its natural (unconstrained) height, avoids
      // that.
      rows.forEach(({ row }) => {
        row.style.minHeight = "";
      });
      const needed = rows.map(({ row, content, photo }) => {
        const rowTop = row.getBoundingClientRect().top;
        const contentBottom = content.getBoundingClientRect().bottom;
        const photoBottom = photo.getBoundingClientRect().bottom;
        return Math.max(contentBottom, photoBottom) - rowTop;
      });
      rows.forEach(({ row }, i) => {
        row.style.minHeight = `${needed[i]}px`;
      });
    };

    recalc();
    // Catches both content reflow (text wrapping differently) and layout
    // mode changes (mobile's stacked photo vs desktop's absolute one, at
    // the 1170px breakpoint) -- either changes one of these elements'
    // rendered size. The window listener is a cheap belt-and-suspenders
    // fallback for the (unlikely) case a breakpoint flip resizes neither
    // observed element.
    const observer = new ResizeObserver(recalc);
    rows.forEach(({ content, photo }) => {
      observer.observe(content);
      observer.observe(photo);
    });
    window.addEventListener("resize", recalc);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalc);
      rows.forEach(({ row }) => {
        row.style.minHeight = "";
      });
    };
  }, [experiences]);

  return (
    <>
      <Header useMotion={true} {...config.sections.experience} />

      <div className="mt-20 flex flex-col" ref={containerRef}>
        <VerticalTimeline>
          {experiences.map((experience, index) => (
            <ExperienceCard
              key={experience.id ?? index}
              {...experience}
              isLast={index === experiences.length - 1}
            />
          ))}
          {/* Appended AFTER every mapped card, not interleaved -- keeps
              the library's own :nth-child(even) alternating-side CSS
              (two-column desktop layout) counting correctly among the
              real .vertical-timeline-element siblings; these plain divs
              don't match that selector at all, so their presence at the
              end doesn't shift anything before them.

              Five, not one -- all running the SAME rise animation, just
              staggered by an even fraction of its own duration via
              animation-delay, so they read as one continuous queue
              climbing the line rather than a single lonely arrow. */}
          {Array.from({ length: ARROW_QUEUE_COUNT }, (_, i) => (
            <div
              key={i}
              className="timeline-progress-arrow"
              style={{ animationDelay: `${(i * ARROW_RISE_DURATION_S) / ARROW_QUEUE_COUNT}s` }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                <path
                  d="M12 19V5M12 5L5 12M12 5l7 7"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ))}
        </VerticalTimeline>
      </div>
    </>
  );
};

export default SectionWrapper(Experience, "experience");
