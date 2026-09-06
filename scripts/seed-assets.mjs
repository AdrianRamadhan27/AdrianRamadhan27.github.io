// One-time helper: uploads the recovered old-site images (project
// screenshots + profile photo) into Supabase Storage and points the
// matching rows at them. Run locally, never in CI:
//
//   1. Get your service_role key: Supabase dashboard -> Project Settings
//      -> API -> "service_role" secret. This key bypasses RLS entirely --
//      keep it out of git and out of the browser bundle. It is NOT the
//      same as the anon key already in your .env.
//   2. Create a local .env.seed (gitignored) next to this file:
//        SUPABASE_URL=https://xxxx.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   3. Run: node scripts/seed-assets.mjs
//   4. Delete .env.seed (or at least don't commit it) when you're done.
//
// Run supabase/seed.sql in the SQL Editor BEFORE this script -- it needs
// the project rows to already exist so it can match them by name.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = { ...loadEnvFile(path.join(repoRoot, ".env.seed")), ...process.env };
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Create .env.seed next to this script (see the comment at the top of the file) or export them in your shell."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "public-assets";
const ASSETS_DIR = path.join(repoRoot, "supabase", "seed-assets");

const PROJECT_IMAGES = {
  SuaraHati: "suarahati.png",
  "Portfolio (previous version)": "portfolio.png",
  "OCA Interaction Custom Dashboard": "oca.png",
  "BRIBRAIN Letter Generator": "lettergenerator.png",
  "Talacare A1": "talacarea1.jpg",
  "Apartment Listings Model": "apartment.png",
  Tracko: "tracko.png",
  Mercatura: "mercatura.jpg",
  "Anime Recommendation System": "anime.png",
};

function contentTypeFor(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function uploadFile(localPath, storagePath) {
  const body = readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, body, {
      contentType: contentTypeFor(localPath),
      upsert: true,
    });
  if (error) throw error;
  return storagePath;
}

async function seedProjectImages() {
  for (const [name, filename] of Object.entries(PROJECT_IMAGES)) {
    const localPath = path.join(ASSETS_DIR, "projects", filename);
    if (!existsSync(localPath)) {
      console.warn(`  skip "${name}": ${localPath} not found`);
      continue;
    }

    const storagePath = `projects/${filename}`;
    await uploadFile(localPath, storagePath);

    const { data, error } = await supabase
      .from("projects")
      .update({ image_path: storagePath })
      .eq("name", name)
      .select();

    if (error) {
      console.error(`  ! "${name}": update failed:`, error.message);
    } else if (!data || data.length === 0) {
      console.warn(`  ! "${name}": uploaded but no matching row -- run supabase/seed.sql first?`);
    } else {
      console.log(`  ok "${name}" -> ${storagePath}`);
    }
  }
}

async function seedProfilePhoto() {
  const localPath = path.join(ASSETS_DIR, "profile.jpg");
  if (!existsSync(localPath)) {
    console.warn(`  skip profile photo: ${localPath} not found`);
    return;
  }

  const storagePath = "photo/profile.jpg";
  await uploadFile(localPath, storagePath);

  const { error } = await supabase
    .from("profile")
    .update({ photo_path: storagePath })
    .eq("id", 1);

  if (error) console.error("  ! profile photo update failed:", error.message);
  else console.log(`  ok profile photo -> ${storagePath}`);
}

console.log("Uploading project screenshots...");
await seedProjectImages();

console.log("\nUploading profile photo...");
await seedProfilePhoto();

console.log(
  "\nDone. No CV was in the old repo (it used a Google Drive embed) -- upload your CV PDF from the CMS Profile tab, and any per-skill icons you want from the Skills tab."
);
