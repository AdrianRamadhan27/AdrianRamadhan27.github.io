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
}: {
  className?: string;
  iconClassName?: string;
}) => {
  const { socials } = useContent();

  if (socials.length === 0) return null;

  return (
    <div className={className}>
      {socials.map((social) => {
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
