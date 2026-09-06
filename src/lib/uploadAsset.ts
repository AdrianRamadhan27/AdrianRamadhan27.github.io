import { supabase } from "./supabase";

const BUCKET = "public-assets";
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Downscales + re-encodes an image client-side before it ever reaches
// storage — the old site shipped multi-MB photos straight from public/;
// a CMS upload button makes that mistake trivially repeatable otherwise.
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export async function uploadAsset(
  folder: string,
  file: File,
  opts: { resize?: boolean } = {}
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const shouldResize = opts.resize ?? file.type.startsWith("image/");
  const body = shouldResize ? await resizeImage(file) : file;
  const ext = shouldResize ? "jpg" : file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: shouldResize ? "image/jpeg" : file.type,
    upsert: false,
  });

  if (error) throw error;
  return path;
}
