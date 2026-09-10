export type TCommonProps = {
  title?: string;
  name?: string;
  icon?: string;
};

export type TExperience = {
  id?: string;
  companyName: string;
  iconBg: string;
  date: string;
  points: string[];
  // Opposite-side portrait/team photo in the timeline -- optional, most
  // entries (including every bundled fallback one) won't have one, and the
  // card renders without it when absent rather than showing an empty box.
  photo?: string;
} & Required<Omit<TCommonProps, "name">>;

export type TProject = {
  id?: string;
  // Longer blurb, now shown only on hover (see Works.tsx) rather than
  // always-visible -- `subtitle` below took over its old always-shown spot.
  description: string;
  // Short tagline under the project name, e.g. "Agentic AI Job hunting
  // platform" -- editable in the CMS, always visible (unlike description).
  subtitle: string;
  tags: {
    name: string;
    color: string;
  }[];
  image: string;
  sourceCodeLink: string;
  liveLink?: string;
} & Required<Pick<TCommonProps, "name">>;

export type TTechnology = { id?: string; category?: string } & Required<
  Omit<TCommonProps, "title">
>;

export type TNavLink = {
  id: string;
} & Required<Pick<TCommonProps, "title">>;

export type TService = Required<Omit<TCommonProps, "name">>;

export type TSocial = {
  id?: string;
  label: string;
  url: string;
  iconKey: string;
};

export type TProfile = {
  fullName: string;
  headline: string;
  heroLines: string[];
  aboutText: string;
  email: string;
  photoUrl?: string;
  // True when photoUrl is a transparent cutout PNG -- the hero then drops
  // the card frame, fades the portrait's bottom edge, and glows the
  // silhouette green (see FlipAvatar).
  photoCutout?: boolean;
  cvUrl?: string;
  // LinkedIn embed card overrides (see LinkedInCard) -- LinkedIn can't be
  // scraped, so these are set in the CMS to match the real profile. Each
  // falls back to the general field / latest job title when unset.
  linkedinName?: string;
  linkedinHeadline?: string;
  linkedinPhotoUrl?: string;
  // Hero stats card, e.g. "3+ Years Experience" / "12+ Projects Done" --
  // plain editable numbers (see schema.sql), not inferred from data
  // elsewhere. Optional/undefined hides the card entirely, rather than
  // showing a hollow "0+" before these are ever filled in.
  yearsExperience?: number;
  projectsDone?: number;
};

export type THeroVariant = "computer" | "avatar";

export type TChatPublicSettings = {
  enabled: boolean;
  greeting: string;
  model: string;
  heroVariant: THeroVariant;
  avatarUrl?: string;
  voiceEnabled: boolean;
};

export type TMotion = {
  direction: "up" | "down" | "left" | "right" | "";
  type: "tween" | "spring" | "just" | "";
  delay: number;
  duration: number;
};
