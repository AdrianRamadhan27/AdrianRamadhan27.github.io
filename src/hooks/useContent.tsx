import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase, publicAssetUrl } from "../lib/supabase";
import { config } from "../constants/config";
import {
  experiences as defaultExperiences,
  projects as defaultProjects,
  technologies as defaultTechnologies,
  socials as defaultSocials,
} from "../constants";
import { logo as logoFallbackIcon } from "../assets";
import type {
  TExperience,
  TProject,
  TTechnology,
  TSocial,
  TProfile,
  TChatPublicSettings,
} from "../types";

type TContent = {
  profile: TProfile;
  experiences: TExperience[];
  projects: TProject[];
  technologies: TTechnology[];
  socials: TSocial[];
  chatPublic: TChatPublicSettings;
  loading: boolean;
};

const defaultProfile: TProfile = {
  fullName: config.html.fullName,
  headline: config.hero.p.join(" "),
  heroLines: config.hero.p,
  aboutText: config.sections.about.content ?? "",
  email: config.html.email,
};

const defaultChatPublic: TChatPublicSettings = {
  enabled: false,
  greeting: "Hi! This terminal isn't wired up to a model yet.",
  model: "",
};

const ContentContext = createContext<TContent>({
  profile: defaultProfile,
  experiences: defaultExperiences,
  projects: defaultProjects,
  technologies: defaultTechnologies,
  socials: defaultSocials,
  chatPublic: defaultChatPublic,
  loading: false,
});

export const useContent = () => useContext(ContentContext);

// Fetches one table and maps it; on any error (missing table, RLS denial,
// paused/unreachable project) it silently keeps the bundled fallback so the
// public site never renders empty.
async function loadTable<TRow, TMapped>(
  table: string,
  mapRow: (row: TRow) => TMapped,
  fallback: TMapped[]
): Promise<TMapped[]> {
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return fallback;
    return (data as TRow[]).map(mapRow);
  } catch {
    return fallback;
  }
}

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<TProfile>(defaultProfile);
  const [experiences, setExperiences] =
    useState<TExperience[]>(defaultExperiences);
  const [projects, setProjects] = useState<TProject[]>(defaultProjects);
  const [technologies, setTechnologies] =
    useState<TTechnology[]>(defaultTechnologies);
  const [socials, setSocials] = useState<TSocial[]>(defaultSocials);
  const [chatPublic, setChatPublic] =
    useState<TChatPublicSettings>(defaultChatPublic);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [profileRes, exp, proj, tech, soc, chatRes] = await Promise.all([
        supabase.from("profile").select("*").maybeSingle(),
        loadTable<any, TExperience>(
          "experiences",
          (row) => ({
            id: row.id,
            title: row.title,
            companyName: row.company_name,
            icon: publicAssetUrl(row.icon_path) ?? logoFallbackIcon,
            iconBg: row.icon_bg ?? "#0d1f19",
            date: row.date_label,
            points: row.points ?? [],
          }),
          defaultExperiences
        ),
        loadTable<any, TProject>(
          "projects",
          (row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            tags: row.tags ?? [],
            image: publicAssetUrl(row.image_path) ?? logoFallbackIcon,
            sourceCodeLink: row.source_code_link,
            liveLink: row.live_link ?? undefined,
          }),
          defaultProjects
        ),
        loadTable<any, TTechnology>(
          "skills",
          (row) => ({
            id: row.id,
            name: row.name,
            icon: publicAssetUrl(row.icon_path) ?? logoFallbackIcon,
            category: row.category ?? undefined,
          }),
          defaultTechnologies
        ),
        loadTable<any, TSocial>(
          "socials",
          (row) => ({
            id: row.id,
            label: row.label,
            url: row.url,
            iconKey: row.icon_key,
          }),
          defaultSocials
        ),
        supabase
          .from("chat_settings_public")
          .select("enabled, greeting, model")
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (profileRes.data) {
        const row = profileRes.data as any;
        setProfile({
          fullName: row.full_name ?? defaultProfile.fullName,
          headline: row.headline ?? defaultProfile.headline,
          heroLines: row.hero_lines ?? defaultProfile.heroLines,
          aboutText: row.about_text ?? defaultProfile.aboutText,
          email: row.email ?? defaultProfile.email,
          photoUrl: publicAssetUrl(row.photo_path),
          cvUrl: publicAssetUrl(row.cv_path),
        });
      }

      setExperiences(exp);
      setProjects(proj);
      setTechnologies(tech);
      setSocials(soc);

      if (chatRes.data) {
        const row = chatRes.data as any;
        setChatPublic({
          enabled: !!row.enabled,
          greeting: row.greeting ?? defaultChatPublic.greeting,
          model: row.model ?? "",
        });
      }

      setLoading(false);
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      profile,
      experiences,
      projects,
      technologies,
      socials,
      chatPublic,
      loading,
    }),
    [profile, experiences, projects, technologies, socials, chatPublic, loading]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};
