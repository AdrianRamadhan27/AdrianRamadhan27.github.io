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
} & Required<Omit<TCommonProps, "name">>;

export type TProject = {
  id?: string;
  description: string;
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
  cvUrl?: string;
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
