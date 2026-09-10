import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaMedium,
  FaGlobe,
} from "react-icons/fa";
import { SiHuggingface } from "react-icons/si";

import { useContent } from "../../hooks/useContent";

// Shared between Footer (where this row originally lived) and Hero (which
// wants the same row under the CV button) so the icon mapping can't drift
// out of sync between two separate copies.
const iconByKey: Record<string, React.ComponentType<{ className?: string }>> =
  {
    github: FaGithub,
    linkedin: FaLinkedin,
    instagram: FaInstagram,
    medium: FaMedium,
    huggingface: SiHuggingface,
  };

const SocialLinks = ({
  className = "flex items-center gap-5",
  iconClassName = "h-6 w-6",
  // Lets a caller (the hero) drop platforms that get a richer embed of
  // their own elsewhere (GithubCard/LinkedInBadge/MediumCard) instead of
  // also showing as a plain icon right next to them -- Footer doesn't pass
  // this, so it keeps showing every social as a plain icon as before.
  excludeIconKeys = [],
}: {
  className?: string;
  iconClassName?: string;
  excludeIconKeys?: string[];
}) => {
  const { socials } = useContent();
  // Collapse repeats of the same platform to the first entry: someone can
  // link two GitHub accounts (a personal one and a work one -- the hero
  // card rotates between them, Projects shows a chart for each), but this
  // plain icon row wants just the one canonical link per platform. The
  // first in CMS sort order is the "main" account.
  const seenKeys = new Set<string>();
  const visibleSocials = socials.filter((s) => {
    if (excludeIconKeys.includes(s.iconKey)) return false;
    if (seenKeys.has(s.iconKey)) return false;
    seenKeys.add(s.iconKey);
    return true;
  });

  if (visibleSocials.length === 0) return null;

  return (
    <div className={className}>
      {visibleSocials.map((social) => {
        const Icon = iconByKey[social.iconKey] ?? FaGlobe;
        return (
          <a
            key={social.id ?? social.label}
            href={social.url}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            className="text-secondary hover:text-accent pointer-events-auto text-[22px] transition-colors"
          >
            <Icon className={iconClassName} />
          </a>
        );
      })}
    </div>
  );
};

export default SocialLinks;
