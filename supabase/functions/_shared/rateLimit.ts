// Shared per-IP rate limiting against the one `rate_limits` table, used by
// every public edge function (chat, speak, transcribe). Extracted from
// chat/index.ts's original inline implementation so speak/transcribe don't
// each carry their own copy of the same hashing + window logic.
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// `bucket` namespaces the limit per endpoint (e.g. "chat", "tts", "stt") --
// all three share the one rate_limits table, so the bucket is baked into
// the row's key rather than the table having a separate column, keeping
// each endpoint's budget independent (spamming voice replies can't burn
// through the text-chat allowance and vice versa).
export async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  req: Request,
  bucket: string,
  windowMs: number,
  maxRequests: number
): Promise<boolean> {
  const ip = clientIp(req);
  const key = `${bucket}:${await hashIp(ip)}`;
  const now = Date.now();

  const { data: rl } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("ip_hash", key)
    .maybeSingle();

  if (rl && now - new Date(rl.window_start).getTime() < windowMs) {
    if (rl.count >= maxRequests) return false;
    await supabase.from("rate_limits").update({ count: rl.count + 1 }).eq("ip_hash", key);
    return true;
  }

  await supabase.from("rate_limits").upsert({
    ip_hash: key,
    window_start: new Date(now).toISOString(),
    count: 1,
  });
  return true;
}
