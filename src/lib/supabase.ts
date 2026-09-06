import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When the env vars are missing (local dev without a .env, or a build where
// Supabase secrets weren't injected) every consumer falls back to the
// bundled default content instead of crashing.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;

const BUCKET = "public-assets";

export function publicAssetUrl(path?: string | null): string | undefined {
  if (!path || !supabase) return undefined;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
