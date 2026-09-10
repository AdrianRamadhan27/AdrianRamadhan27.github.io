import {
  getGithubAccounts,
  githubContributionChartUrl,
  type GithubAccount,
} from "../../utils/github";
import { useContent } from "../../hooks/useContent";

// Replaces the intro paragraph that used to sit directly below the
// Projects header (config.sections.works.content, still defined but no
// longer rendered here -- see Works.tsx) with the real GitHub daily-
// contribution calendar instead of static copy. One row per linked GitHub
// account (personal + work), stacked -- see GithubCard's own comment
// (hero) for what this data actually is/isn't: a free public SVG heatmap
// mirroring each account's own GitHub profile, including private activity
// only if that account has GitHub's own "include private contributions"
// setting enabled -- not a live fetch of anything sensitive.

const ChartRow = ({ account }: { account: GithubAccount }) => {
  // Only show the label when it carries more than the generic "GitHub"
  // (e.g. "GitHub (Work)") -- otherwise the @handle alone is the caption.
  const hasDistinctLabel =
    account.label && !/^github$/i.test(account.label.trim());

  return (
    <a
      href={`https://github.com/${account.username}`}
      target="_blank"
      rel="noreferrer"
      className="bg-tertiary/60 border-accent/20 pointer-events-auto block w-full max-w-3xl overflow-x-auto rounded-2xl border p-5 transition-transform hover:scale-[1.01]"
    >
      <p className="text-secondary mb-3 text-[13px] font-semibold uppercase tracking-wider">
        {hasDistinctLabel
          ? `${account.label} · @${account.username}`
          : `@${account.username} on GitHub`}
      </p>
      {/* min-w so the calendar's own day-squares stay legible on a narrow
          screen instead of being scaled down to illegibility -- the card
          scrolls horizontally there (overflow-x-auto above) rather than
          shrinking the graph to fit. */}
      <img
        src={githubContributionChartUrl(account.username)}
        alt={`${account.username}'s GitHub contribution calendar`}
        className="h-auto w-full min-w-[600px] rounded-lg"
        loading="lazy"
      />
    </a>
  );
};

const GithubContributionChart = () => {
  const { socials } = useContent();
  const accounts = getGithubAccounts(socials);

  // No GitHub social link configured (or none is actually a github.com
  // URL) -- nothing to embed.
  if (accounts.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col items-center gap-3">
      {accounts.map((account) => (
        <ChartRow key={account.username} account={account} />
      ))}
    </div>
  );
};

export default GithubContributionChart;
