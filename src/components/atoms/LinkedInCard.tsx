import { FaLinkedin } from "react-icons/fa";

import { useContent } from "../../hooks/useContent";
import { getLinkedInVanity } from "../../utils/linkedin";

// A fully custom-built card, NOT LinkedIn's official "Profile Badge"
// widget (an earlier version used that) -- that widget is a cross-origin
// iframe LinkedIn controls entirely, impossible to restyle to match this
// site, and its "vertical" layout renders far taller than intended even
// after capping/cropping it. Unlike GitHub, LinkedIn has no public API
// for this, and directly requesting a public profile page (even just for
// its og: preview meta tags, the way link-preview bots do) returns
// LinkedIn's dedicated anti-scraping block (HTTP 999, confirmed directly)
// -- there's no legitimate way to pull live LinkedIn data client- or
// server-side here.
//
// So this reuses data already in the CMS instead, not a live fetch from
// LinkedIn at all: profile.fullName and profile.photoUrl are already shown
// elsewhere (Hero/About). The subtitle line is the latest job title --
// experiences[0], the Experience section's own top/most-recent entry
// (that list is already ordered newest-first; see Experience.tsx's own
// comment on the arrow queue pointing at "the current/most recent role's
// icon" for the same assumption) -- falling back to profile.headline (an
// existing Profile-tab field, otherwise unused on the public site) only
// if no experience entries exist at all.
const LinkedInCard = ({ className = "" }: { className?: string }) => {
  const { profile, socials, experiences } = useContent();
  const vanity = getLinkedInVanity(socials);
  const latestJob = experiences[0];
  const subtitle = latestJob
    ? `${latestJob.title} at ${latestJob.companyName}`
    : profile.headline;

  // No LinkedIn social link configured (or it's not actually a
  // linkedin.com/in/... URL) -- nothing to link this card to.
  if (!vanity) return null;

  return (
    <a
      href={`https://www.linkedin.com/in/${vanity}`}
      target="_blank"
      rel="noreferrer"
      // LinkedIn's own brand blue (#0A66C2, their actual logo/button
      // color) tinted into a dark card, not this site's usual
      // bg-tertiary/border-accent green -- mirrors GithubCard now using
      // GitHub's own dark palette instead of that same green, so each
      // card reads as THAT platform's own branded embed rather than two
      // identical green boxes with different logos.
      //
      // No explicit h-full here -- this is a flex item in a row with the
      // default align-items:stretch (HeroSocialEmbeds), which only takes
      // effect when the item's own height is left at the `auto` keyword;
      // a specified height:100% (h-full) resolves via ordinary percentage
      // rules against the row's own indefinite height instead (itself
      // `auto`, since IT is sized by its tallest child), which computes
      // back to this element's own content height and quietly opts it
      // OUT of being stretched to match GithubCard -- confirmed directly
      // (109.5px vs GithubCard's 209.4px) before removing it.
      className={`pointer-events-auto flex flex-col rounded-2xl border border-[#0a66c2]/40 bg-[#0a2540] p-4 transition-transform hover:scale-[1.02] hover:border-[#0a66c2]/70 ${className}`}
    >
      <div className="flex items-center gap-3">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.fullName}
            className="h-10 w-10 flex-shrink-0 rounded-full border border-[#0a66c2]/50 object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#0a66c2]/50 bg-[#0a66c2]/20 text-[#70b5f9]">
            <FaLinkedin className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-white">
            {profile.fullName}
          </p>
          {subtitle && (
            <p className="truncate text-[11px] text-[#8fb8e0]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-[#70b5f9]">
        <FaLinkedin className="h-4 w-4" />
        Connect on LinkedIn
      </div>
    </a>
  );
};

export default LinkedInCard;
