import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";

import { useContent } from "../../hooks/useContent";
import { useCountUp } from "../../hooks/useCountUp";
import { getGithubUsername } from "../../utils/github";

type GithubProfile = {
  avatarUrl: string;
  name: string;
  login: string;
  publicRepos: number;
  followers: number;
};

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
// No contribution chart here anymore -- moved to its own
// GithubContributionChart, now shown in the Projects section instead of
// squeezed into this hero card next to LinkedInCard.
const GithubCard = ({ className = "" }: { className?: string }) => {
  const { socials } = useContent();
  const username = getGithubUsername(socials);
  const [profile, setProfile] = useState<GithubProfile | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setProfile({
          avatarUrl: data.avatar_url,
          name: data.name || data.login,
          login: data.login,
          publicRepos: data.public_repos ?? 0,
          followers: data.followers ?? 0,
        });
      } catch {
        // Network hiccup or rate limit -- the profile row just doesn't
        // render (see below); the contribution chart doesn't depend on
        // this fetch at all, so it still shows regardless.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // No GitHub social link configured (or it's not actually a github.com
  // URL) -- nothing to embed.
  if (!username) return null;

  return (
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noreferrer"
      // GitHub's own actual dark-mode palette (#0d1117 canvas, #30363d
      // border -- not this site's usual bg-tertiary/border-accent green)
      // so this reads as a GitHub-branded embed at a glance, the same way
      // LinkedInCard now uses LinkedIn's blue instead of that same green.
      className={`pointer-events-auto block rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 transition-transform hover:scale-[1.02] hover:border-[#8b949e] ${className}`}
    >
      {profile && (
        <div>
          {/* github.com/<username> in place of the real name/@handle --
              without this the card had nothing actually saying "GitHub"
              on it (no logo, no URL), easy to mistake for a generic
              profile card at a glance; the name/handle it replaced didn't
              carry that signal at all. #58a6ff is GitHub's own dark-mode
              link color, not this site's green. */}
          <div className="flex items-center gap-3">
            <img
              src={profile.avatarUrl}
              alt={profile.login}
              className="h-10 w-10 flex-shrink-0 rounded-full border border-[#30363d] object-cover"
            />
            <div className="flex min-w-0 items-center gap-1.5 font-semibold text-[#58a6ff]">
              <FaGithub className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-[13px]">
                github.com/{username}
              </span>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-6">
            <StatNumber value={profile.publicRepos} label="Repos" />
            <StatNumber value={profile.followers} label="Followers" />
          </div>
        </div>
      )}
    </a>
  );
};

export default GithubCard;
