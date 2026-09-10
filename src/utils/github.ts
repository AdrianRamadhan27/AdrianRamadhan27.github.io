import { TSocial } from "../types";

export type GithubAccount = {
  username: string;
  /** The Socials-list label for this account, e.g. "GitHub" or
   *  "GitHub (Work)" -- used to caption the per-account contribution chart. */
  label: string;
  url: string;
};

// Every GitHub account linked in the Socials list (CMS Socials tab), in
// the CMS sort order, deduped by username. A portfolio legitimately has
// more than one -- a personal account and a work/org one -- so this
// returns all of them rather than just the first: the hero GithubCard
// rotates through them and the Projects section shows one contribution
// calendar per account. The FIRST entry is the "main" account (the only
// one the footer icon row shows). Same one-source-of-truth reasoning as
// before -- the username comes from the social link's own URL, no
// separate CMS field.
export function getGithubAccounts(socials: TSocial[]): GithubAccount[] {
  const accounts: GithubAccount[] = [];
  for (const social of socials) {
    if (social.iconKey !== "github" || !social.url) continue;
    try {
      const url = new URL(social.url);
      if (!/(^|\.)github\.com$/i.test(url.hostname)) continue;
      const username = url.pathname.split("/").filter(Boolean)[0];
      if (!username) continue;
      if (
        accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())
      ) {
        continue;
      }
      accounts.push({ username, label: social.label, url: social.url });
    } catch {
      // Malformed URL -- skip this entry, keep scanning the rest.
    }
  }
  return accounts;
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
