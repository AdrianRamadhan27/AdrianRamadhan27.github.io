import {
  getGithubUsername,
  githubContributionChartUrl,
} from "../../utils/github";
import { useContent } from "../../hooks/useContent";

// Replaces the intro paragraph that used to sit directly below the
// Projects header (config.sections.works.content, still defined but no
// longer rendered here -- see Works.tsx) with the real GitHub daily-
// contribution calendar instead of static copy. See GithubCard's own
// comment (hero) for what this data actually is/isn't: a free public SVG
// heatmap mirroring the account's own GitHub profile, including private
// activity only if that account has GitHub's own "include private
// contributions" setting enabled -- not a live fetch of anything sensitive.
const GithubContributionChart = () => {
  const { socials } = useContent();
  const username = getGithubUsername(socials);

  // No GitHub social link configured (or it's not actually a github.com
  // URL) -- nothing to embed.
  if (!username) return null;

  return (
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noreferrer"
      className="bg-tertiary/60 border-accent/20 pointer-events-auto mx-auto mt-3 block w-full max-w-3xl overflow-x-auto rounded-2xl border p-5 transition-transform hover:scale-[1.01]"
    >
      <p className="text-secondary mb-3 text-[13px] font-semibold uppercase tracking-wider">
        @{username} on GitHub
      </p>
      {/* min-w so the calendar's own day-squares stay legible on a narrow
          screen instead of being scaled down to illegibility -- the card
          scrolls horizontally there (overflow-x-auto above) rather than
          shrinking the graph to fit. */}
      <img
        src={githubContributionChartUrl(username)}
        alt={`${username}'s GitHub contribution calendar`}
        className="h-auto w-full min-w-[600px] rounded-lg"
        loading="lazy"
      />
    </a>
  );
};

export default GithubContributionChart;
