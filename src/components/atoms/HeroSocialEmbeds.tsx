import GithubCard from "./GithubCard";
import LinkedInCard from "./LinkedInCard";
import SocialLinks from "./SocialLinks";

// Replaces the plain social-icon row in the HERO specifically -- Footer
// still renders the full <SocialLinks> icon row unfiltered (every social,
// Instagram/Medium included), this doesn't touch that. GitHub/LinkedIn get
// real embeds here, side by side (see each component's own comment for
// exactly what data backs each one). Instagram and Medium are explicitly
// dropped from the hero entirely (not just left as plain icons) -- the
// leftover SocialLinks row below still exists for whatever ELSE gets added
// as a social later (HuggingFace, say), but currently renders nothing
// since github/linkedin/instagram/medium covers every social this site
// actually has right now.
const HeroSocialEmbeds = ({ className = "mt-6" }: { className?: string }) => (
  <div className={`flex max-w-xl flex-col gap-3 ${className}`}>
    {/* min-w-0 on both -- flex items default to min-width:auto (won't
        shrink below their own content's natural width); without this a
        long real name/headline at either card would refuse to actually
        share the row and push the other one (and the page itself, on a
        narrow viewport) out past its bounds instead of fitting side by
        side and truncating instead. */}
    <div className="flex items-stretch gap-3">
      <GithubCard className="min-w-0 flex-1" />
      <LinkedInCard className="min-w-0 flex-1" />
    </div>
    <SocialLinks
      className="pointer-events-auto mt-1 flex items-center gap-5"
      iconClassName="h-5 w-5"
      excludeIconKeys={["github", "linkedin", "instagram", "medium"]}
    />
  </div>
);

export default HeroSocialEmbeds;
