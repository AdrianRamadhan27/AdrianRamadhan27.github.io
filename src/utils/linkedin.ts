import { TSocial } from "../types";

// Derives LinkedIn's "vanity name" (the slug after /in/) from the existing
// LinkedIn social link -- same one-source-of-truth reasoning as
// getGithubAccounts in ./github.ts: no separate CMS field just to store
// the same identifier twice.
export function getLinkedInVanity(socials: TSocial[]): string | null {
  const social = socials.find((s) => s.iconKey === "linkedin" && s.url);
  if (!social) return null;
  try {
    const url = new URL(social.url);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("in");
    const vanity = idx >= 0 ? parts[idx + 1] : null;
    return vanity || null;
  } catch {
    return null;
  }
}
