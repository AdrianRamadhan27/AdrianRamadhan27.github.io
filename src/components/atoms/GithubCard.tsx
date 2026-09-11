import { useEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";

import { useContent } from "../../hooks/useContent";
import { useCountUp } from "../../hooks/useCountUp";
import { getGithubAccounts } from "../../utils/github";

type GithubProfile = {
  avatarUrl: string;
  name: string;
  login: string;
  publicRepos: number;
  followers: number;
  // All-time contribution count (sum of every year on the profile graph,
  // private activity included when that account opts in) -- from a
  // separate keyless, CORS-open endpoint; undefined if that fetch failed,
  // in which case the card falls back to showing followers.
  contributions?: number;
};

// jogruber's GitHub-contributions API: scrapes the same profile
// contribution graph GitHub renders (so it reflects the account's
// "include private contributions" setting), keyless, `access-control-
// allow-origin: *`. No query param -> `total` is a { year: count } map;
// summing it gives the all-time total.
async function fetchTotalContributions(username: string): Promise<number | undefined> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${username}`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const totals = data?.total;
    if (!totals || typeof totals !== "object") return undefined;
    return Object.values(totals).reduce(
      (sum: number, n) => sum + (typeof n === "number" ? n : 0),
      0
    );
  } catch {
    return undefined;
  }
}

// Both api.github.com AND the jogruber contributions API are keyless,
// fetched straight from the VISITOR's own browser -- so their rate limits
// (60 unauthenticated requests/hour/IP for GitHub; "10 requests/10s" for
// jogruber, confirmed via its own response headers) apply per visitor,
// not per site. A visitor who reloads/tests a lot (a developer iterating
// on the page, most of all) can burn through 60/hour on just this card --
// 1-2 GitHub requests per linked account per page load adds up fast.
// GitHub's response on a rate-limited request is a real HTTP error (403,
// !res.ok), not a hang, so without this cache the card just renders
// nothing (profiles[username] never gets set -- see the `{profile && ...}`
// gate below) until the visitor's hourly window resets. Caching the last
// successful fetch per account means a later rate-limited load keeps
// showing that instead of going blank; it only helps once this browser
// has shown the card successfully at least once, which is exactly the
// "worked before, empty now" pattern this exists to fix.
const CACHE_PREFIX = "gh_profile_cache_v1:";

function loadCachedProfile(username: string): GithubProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + username);
    return raw ? (JSON.parse(raw) as GithubProfile) : null;
  } catch {
    return null;
  }
}

function saveCachedProfile(username: string, profile: GithubProfile) {
  try {
    localStorage.setItem(CACHE_PREFIX + username, JSON.stringify(profile));
  } catch {
    /* storage unavailable/full -- the fetch itself still succeeded */
  }
}

// How long each account stays on screen before the card rotates to the
// next one. Only matters when more than one GitHub account is linked.
const ROTATE_MS = 5000;

const StatNumber = ({ value, label }: { value: number; label: string }) => {
  const displayValue = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-[16px] font-black leading-none text-white">
        {displayValue}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
    </div>
  );
};

// Compact hero-sized profile card -- built from GitHub's own official
// public REST API (api.github.com/users/<username>, keyless, CORS-open)
// rather than a third-party image-generator service: an earlier version
// used github-readme-stats.vercel.app for this and that community-run
// instance turned out to be down (DEPLOYMENT_PAUSED, confirmed directly
// against it), which is too fragile to depend on for a portfolio page.
//
// When more than one GitHub account is linked in Socials (a personal one
// and a work one), the card rotates between them on a timer -- every
// account's profile is fetched ONCE up front and cached, so the rotation
// just swaps which cached one is shown rather than re-hitting the API
// each tick (unauthenticated api.github.com is 60 requests/hour/IP -- a
// fetch per 5s tick would blow that in minutes).
//
// No contribution chart here anymore -- moved to its own
// GithubContributionChart, now shown in the Projects section (one row per
// account) instead of squeezed into this hero card next to LinkedInCard.
const GithubCard = ({ className = "" }: { className?: string }) => {
  const { socials } = useContent();
  const accounts = getGithubAccounts(socials);
  const usernamesKey = accounts.map((a) => a.username).join(",");

  // Seeded from localStorage (see loadCachedProfile's comment) so a
  // rate-limited fetch on THIS load still shows whatever this browser
  // last saw successfully, instead of the card going blank.
  const [profiles, setProfiles] = useState<Record<string, GithubProfile>>(() => {
    const seed: Record<string, GithubProfile> = {};
    for (const { username } of accounts) {
      const cached = loadCachedProfile(username);
      if (cached) seed[username] = cached;
    }
    return seed;
  });
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  // Fetch every linked account's profile once.
  useEffect(() => {
    if (accounts.length === 0) return;
    let cancelled = false;
    // Re-hydrate here too, not just in useState's initializer -- socials
    // (and so `accounts`) can still be loading from Supabase on mount, in
    // which case usernamesKey (and this effect) only fires once the real
    // list is known, after the initializer already ran with an empty one.
    setProfiles((prev) => {
      const next = { ...prev };
      for (const { username } of accounts) {
        if (!next[username]) {
          const cached = loadCachedProfile(username);
          if (cached) next[username] = cached;
        }
      }
      return next;
    });
    accounts.forEach(async ({ username }) => {
      try {
        const [res, contributions] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`),
          fetchTotalContributions(username),
        ]);
        if (cancelled) return;
        if (!res.ok) {
          // Distinguish a rate limit from any other failure so it's
          // diagnosable from the console instead of just "went blank" --
          // GitHub's own rate-limit headers say exactly when it resets.
          const remaining = res.headers.get("x-ratelimit-remaining");
          const resetHeader = res.headers.get("x-ratelimit-reset");
          const reason =
            res.status === 403 && remaining === "0"
              ? `rate-limited (resets ${
                  resetHeader
                    ? new Date(Number(resetHeader) * 1000).toLocaleTimeString()
                    : "within an hour"
                })`
              : `HTTP ${res.status}`;
          console.info(
            `[github-card] ${username}: ${reason} -- ${
              loadCachedProfile(username) ? "showing last cached data" : "no cached data, card stays empty"
            }`
          );
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        // A transient jogruber failure shouldn't blank out a contributions
        // number this account already had cached.
        const profile: GithubProfile = {
          avatarUrl: data.avatar_url,
          name: data.name || data.login,
          login: data.login,
          publicRepos: data.public_repos ?? 0,
          followers: data.followers ?? 0,
          contributions: contributions ?? loadCachedProfile(username)?.contributions,
        };
        setProfiles((prev) => ({ ...prev, [username]: profile }));
        saveCachedProfile(username, profile);
      } catch {
        // Network hiccup -- keep whatever's cached/already shown.
        console.info(`[github-card] ${username}: fetch threw -- keeping cached/existing data`);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernamesKey]);

  // Rotate through the accounts. Skips a tick while the pointer is over
  // the card so the href doesn't change out from under a click.
  useEffect(() => {
    if (accounts.length < 2) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % accounts.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [accounts.length]);

  // accounts can shrink between renders (a social removed) -- clamp.
  const account = accounts[index] ?? accounts[0];
  if (!account) return null;
  const profile = profiles[account.username];

  return (
    <a
      href={`https://github.com/${account.username}`}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      // GitHub's own actual dark-mode palette (#0d1117 canvas, #30363d
      // border -- not this site's usual bg-tertiary/border-accent green)
      // so this reads as a GitHub-branded embed at a glance, the same way
      // LinkedInCard uses LinkedIn's blue instead of that same green.
      className={`pointer-events-auto block rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 transition-transform hover:scale-[1.02] hover:border-[#8b949e] ${className}`}
    >
      {profile && (
        // key on the username so React remounts this subtree on rotation:
        // the fade-in plays and every StatNumber's count-up restarts from
        // 0 for the new account's numbers.
        <div key={account.username} className="animate-fade">
          {/* The GitHub mark + the bare username -- the icon already says
              which platform this is, so no "github.com/" prefix or real
              name/@handle. #58a6ff is GitHub's own dark-mode link color,
              not this site's green. */}
          <div className="flex items-center gap-3">
            <img
              src={profile.avatarUrl}
              alt={profile.login}
              className="h-10 w-10 flex-shrink-0 rounded-full border border-[#30363d] object-cover"
            />
            <div className="flex min-w-0 items-center gap-1.5 font-semibold text-[#58a6ff]">
              <FaGithub className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-[13px]">{account.username}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-6">
            <StatNumber value={profile.publicRepos} label="Repos" />
            {profile.contributions !== undefined ? (
              <StatNumber value={profile.contributions} label="Contributions" />
            ) : (
              <StatNumber value={profile.followers} label="Followers" />
            )}
          </div>
          {accounts.length > 1 && (
            // Which account of N is showing -- small dots, GitHub-muted.
            <div className="mt-3 flex justify-center gap-1.5">
              {accounts.map((a, i) => (
                <span
                  key={a.username}
                  className={`h-1 w-1 rounded-full ${
                    i === index ? "bg-[#58a6ff]" : "bg-[#30363d]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </a>
  );
};

export default GithubCard;
