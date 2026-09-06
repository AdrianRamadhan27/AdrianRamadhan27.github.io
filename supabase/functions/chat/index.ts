// Public endpoint. Streams a chat completion from whatever OpenAI-compatible
// provider is configured in chat_settings/chat_secrets — the client never
// sees the base URL, API key, or system prompt directly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOKENS_CEILING = 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type ClientMessage = { role: "user" | "assistant"; content: string };

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // --- rate limit (best-effort, per hashed IP) ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ipHash = await hashIp(ip);
  const now = Date.now();

  const { data: rl } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (rl && now - new Date(rl.window_start).getTime() < RATE_LIMIT_WINDOW_MS) {
    if (rl.count >= RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ error: "Too many requests, slow down." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await supabase
      .from("rate_limits")
      .update({ count: rl.count + 1 })
      .eq("ip_hash", ipHash);
  } else {
    await supabase.from("rate_limits").upsert({
      ip_hash: ipHash,
      window_start: new Date(now).toISOString(),
      count: 1,
    });
  }

  // --- settings + secret ---
  const [{ data: settings }, { data: secret }] = await Promise.all([
    supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("chat_secrets").select("api_key").eq("id", 1).maybeSingle(),
  ]);

  if (!settings || !settings.enabled) {
    return new Response(
      JSON.stringify({ error: "Chat is not enabled." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!secret?.api_key || !settings.base_url || !settings.model) {
    return new Response(
      JSON.stringify({ error: "Chat is not fully configured yet." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- build + sanitize the message array ---
  let body: { messages?: ClientMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const history = (body.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, MAX_MESSAGE_CHARS),
    }));

  const messages = [
    { role: "system", content: settings.system_prompt },
    ...history,
  ];

  const maxTokens = Math.min(settings.max_tokens ?? 400, MAX_TOKENS_CEILING);

  // --- call the provider and stream its SSE response straight back ---
  const upstream = await fetch(
    `${settings.base_url.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret.api_key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: settings.temperature ?? 0.7,
        max_tokens: maxTokens,
        stream: true,
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Upstream provider error.", detail: text.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
