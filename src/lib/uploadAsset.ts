import { supabase } from "./supabase";

const BUCKET = "public-assets";
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

type ResizedImage = { blob: Blob; contentType: string; ext: string };

// Downscales + re-encodes an image client-side before it ever reaches
// storage — the old site shipped multi-MB photos straight from public/;
// a CMS upload button makes that mistake trivially repeatable otherwise.
//
// PNG (and other alpha-capable formats) stay PNG: re-encoding everything to
// JPEG unconditionally used to flatten transparent pixels to solid black
// (JPEG has no alpha channel, and a canvas's untouched pixels are
// transparent black, so that's what got baked in) -- exactly what breaks a
// skill/company icon uploaded with a transparent background. Only formats
// that were already opaque (JPEG, most photos) get re-encoded as JPEG for
// the smaller file size; anything with alpha is preserved as PNG.
async function resizeImage(file: File): Promise<ResizedImage> {
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
  if (!ctx) return { blob: file, contentType: file.type, ext: "" };
  ctx.drawImage(bitmap, 0, 0, width, height);

  const preserveAlpha = file.type === "image/png" || file.type === "image/webp";
  const outputType = preserveAlpha ? "image/png" : "image/jpeg";
  const outputExt = preserveAlpha ? "png" : "jpg";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, preserveAlpha ? undefined : JPEG_QUALITY);
  });

  return {
    blob: blob ?? file,
    contentType: blob ? outputType : file.type,
    ext: blob ? outputExt : "",
  };
}

export async function uploadAsset(
  folder: string,
  file: File,
  opts: { resize?: boolean } = {}
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const shouldResize = opts.resize ?? file.type.startsWith("image/");
  const resized = shouldResize
    ? await resizeImage(file)
    : { blob: file, contentType: file.type, ext: "" };

  const ext = resized.ext || file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, resized.blob, {
    contentType: resized.contentType,
    upsert: false,
  });

  if (error) throw error;
  return path;
}
