import { TSocial } from "../types";

// Derives the GitHub username from the existing "GitHub" social link
// (Socials tab in the CMS) rather than adding a whole new CMS field just
// to store the same username a second time -- one source of truth, and
// every GitHub embed (GithubCard in the hero, GithubContributionChart in
// Projects) disappears on its own if that social link is ever removed
// instead of needing a separate toggle to keep in sync with it.
export function getGithubUsername(socials: TSocial[]): string | null {
  const social = socials.find((s) => s.iconKey === "github" && s.url);
  if (!social) return null;
  try {
    const url = new URL(social.url);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
    const username = url.pathname.split("/").filter(Boolean)[0];
    return username || null;
  } catch {
    return null;
  }
}

// ghchart.rshah.org renders the same daily-contribution calendar heatmap
// GitHub itself shows on a profile page -- a free, keyless, publicly
// hosted SVG endpoint (no backend/API key of ours involved, same as
// embedding one in a GitHub README). Whether it includes PRIVATE repo
// activity is controlled entirely by the account's own GitHub setting
// ("Include private contributions on my profile") -- this just mirrors
// whatever that account's public contribution graph already shows,
// confirmed directly by testing against an account with 0 public repos
// but a fully populated chart.
export function githubContributionChartUrl(username: string): string {
  return `https://ghchart.rshah.org/00df9a/${username}`;
}
