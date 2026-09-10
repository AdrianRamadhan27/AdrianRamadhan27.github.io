import { useState } from "react";
import Tilt from "react-parallax-tilt";
import { LayoutGroup, motion } from "framer-motion";
import { FiExternalLink } from "react-icons/fi";

import { github } from "../../assets";
import { SectionWrapper } from "../../hoc";
import { fadeIn } from "../../utils/motion";
import { config } from "../../constants/config";
import { Header } from "../atoms/Header";
import GithubContributionChart from "../atoms/GithubContributionChart";
import { TProject } from "../../types";
import { useContent } from "../../hooks/useContent";

const ProjectCard: React.FC<{ index: number } & TProject> = ({
  index,
  name,
  subtitle,
  description,
  tags,
  image,
  sourceCodeLink,
  liveLink,
}) => {
  // index * 0.5 as a per-card delay was fine for the template's original 3
  // dummy projects (max 1s) -- with a real project list it scales unbounded
  // (9 projects = a 4s delay before the last card even starts appearing),
  // which reads as cards randomly "not showing up" if you don't wait the
  // several seconds out. Capped so the stagger stays snappy regardless of
  // how many projects exist.
  //
  // Even/odd picks which side the hover flap pops out to (see
  // .project-desc-flap in globals.css). The row is a centered flex-wrap of
  // fixed-width cards, most commonly 2 per row at this card width within
  // the section's own max-w-7xl -- even index (left column) has its real
  // empty margin to the LEFT, odd (right column) to the RIGHT. This is a
  // fixed alternation, not a measurement of the actual row each card lands
  // in, so it stops being exactly correct if the viewport is wide enough
  // to fit 3+ per row (the middle card's flap would overlap its neighbor)
  // -- an accepted tradeoff since there's no cheap way to know true row
  // membership from a plain CSS flex-wrap without a ResizeObserver per
  // card, and the flap still reads fine overlapping briefly on hover.
  const flapSide = index % 2 === 0 ? "left" : "right";

  return (
    <motion.div
      // layout: when the Sort toggle reverses the list, the cards keyed by
      // project id keep their DOM identity and framer-motion FLIP-animates
      // each one from its old grid slot to its new one instead of jumping.
      // The `layout` spring here is separate from the `variants` entrance
      // transition (which keeps its own timing from fadeIn).
      layout
      variants={fadeIn("up", "spring", Math.min(index * 0.15, 1), 0.75)}
      transition={{ layout: { type: "spring", stiffness: 260, damping: 30 } }}
      className="project-card-wrap relative"
      style={{ perspective: "1400px" }}
    >
      <Tilt
        glareEnable
        tiltEnable
        tiltMaxAngleX={30}
        tiltMaxAngleY={30}
        glareColor="#9fbdb1"
      >
        <div className="bg-tertiary w-full rounded-2xl p-5 sm:w-[380px]">
          {/* aspect-[3/2] (not a fixed height): a landscape box close to
              these projects' own screenshot ratios (~1.2-1.4:1, checked
              directly against the source images) so object-contain -- full
              image always visible, never cropped, unlike object-cover --
              only letterboxes a little rather than shrinking the image
              down inside a much-too-tall box. */}
          <div className="relative aspect-[3/2] w-full">
            <img
              src={image}
              alt={name}
              className="h-full w-full rounded-2xl object-contain"
            />
            <div className="absolute inset-0 m-3 flex justify-end gap-2 opacity-0 transition-opacity duration-300 hover:opacity-100">
              {liveLink && (
                <div
                  onClick={() => window.open(liveLink, "_blank")}
                  title="Live demo"
                  className="black-gradient flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
                >
                  <FiExternalLink className="h-1/2 w-1/2 text-white" />
                </div>
              )}
              <div
                onClick={() => window.open(sourceCodeLink, "_blank")}
                title="Source code"
                className="black-gradient flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
              >
                <img
                  src={github}
                  alt="github"
                  className="h-1/2 w-1/2 object-contain"
                />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-[24px] font-bold text-white">{name}</h3>
            {/* Small green all-caps label, not just a smaller/greyer line
                of body text -- on mobile these two stack directly on top
                of each other with the hover flap unavailable to tell them
                apart visually, so subtitle and description now need to
                read as two different KINDS of text (a tag vs. a
                sentence), not just two sizes of the same one. */}
            {subtitle && (
              <p className="text-accent mt-2 text-[12px] font-semibold uppercase tracking-wide">
                {subtitle}
              </p>
            )}
            {/* Description falls back to always-visible here below lg --
                there's no side margin for the hover flap to pop into on a
                single-column row, and hover itself isn't really a touch
                interaction anyway, so this is the only place it's ever
                seen on mobile/tablet. mt-3 (not mt-2, matching subtitle)
                and a looser leading -- extra separation so it doesn't
                read as a continuation of the subtitle line above it. */}
            <p className="text-secondary mt-3 text-[14px] leading-relaxed lg:hidden">
              {description}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <p key={tag.name} className={`text-[14px] ${tag.color}`}>
                #{tag.name}
              </p>
            ))}
          </div>
        </div>
      </Tilt>

      <div
        className={`project-desc-flap project-desc-flap--${flapSide}`}
        aria-hidden
      >
        <p>{description}</p>
      </div>
    </motion.div>
  );
};

const Works = () => {
  const { projects } = useContent();
  // useContent hands projects over newest-first; "oldest" just reverses.
  // Nothing on the card shows a date, so without this the order is
  // invisible to a visitor.
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const orderedProjects =
    sortOrder === "newest" ? projects : [...projects].reverse();

  return (
    <>
      <Header useMotion={true} {...config.sections.works} />

      {/* The intro paragraph (config.sections.works.content) that used to
          sit here was replaced outright with the GitHub contribution
          chart, not kept alongside it -- config.sections.works.content
          itself is left defined (harmless, unused) rather than deleted,
          in case a future change wants plain intro copy back. */}
      <GithubContributionChart />

      {projects.length > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 text-[13px]">
          <span className="text-secondary">Sort</span>
          <div className="border-accent/20 bg-tertiary/60 inline-flex rounded-full border p-0.5">
            {(["newest", "oldest"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSortOrder(option)}
                aria-pressed={sortOrder === option}
                className={`rounded-full px-3 py-1 capitalize transition-colors ${
                  sortOrder === option
                    ? "bg-accent text-black"
                    : "text-secondary hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      <LayoutGroup>
        <div className="mt-12 flex flex-wrap justify-center gap-7">
          {orderedProjects.map((project, index) => (
            <ProjectCard
              key={project.id ?? `project-${index}`}
              index={index}
              {...project}
            />
          ))}
        </div>
      </LayoutGroup>
    </>
  );
};

export default SectionWrapper(Works, "work");
