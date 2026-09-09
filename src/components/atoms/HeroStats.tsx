import { useContent } from "../../hooks/useContent";

// One "N+ <label>" tile, e.g. "3+ Years Experience". Split out mainly so
// the divider between tiles (below) doesn't have to duplicate this markup.
const StatTile = ({ value, label }: { value: number; label: string }) => (
  <div>
    <p className="text-accent text-[30px] font-black leading-none sm:text-[38px]">
      {value}+
    </p>
    <p className="text-secondary mt-1 text-[11px] uppercase tracking-wider sm:text-[12px]">
      {label}
    </p>
  </div>
);

// The hero's "big number" summary card -- years of experience / projects
// done. Both numbers are plain editable fields in the CMS (Profile tab),
// deliberately NOT inferred from counting `experiences`/`projects` rows or
// from date math on a start date: the headline figure someone wants to
// show off is usually a rounder, more deliberate number than a literal
// count would produce, and only the person editing it actually knows what
// that number should be. See TProfile.yearsExperience/projectsDone.
const HeroStats = ({ className = "mt-6" }: { className?: string }) => {
  const { profile } = useContent();
  const hasYears = profile.yearsExperience !== undefined;
  const hasProjects = profile.projectsDone !== undefined;

  // Both fields start unset until the CMS user fills them in -- render
  // nothing rather than a hollow "0+ Years Experience" placeholder.
  if (!hasYears && !hasProjects) return null;

  return (
    <div
      className={`border-accent/20 bg-tertiary/60 pointer-events-auto flex w-fit items-center gap-6 rounded-2xl border px-6 py-4 backdrop-blur-sm ${className}`}
    >
      {hasYears && <StatTile value={profile.yearsExperience!} label="Years Experience" />}
      {hasYears && hasProjects && <div className="h-10 w-px bg-white/10" />}
      {hasProjects && <StatTile value={profile.projectsDone!} label="Projects Done" />}
    </div>
  );
};

export default HeroStats;
