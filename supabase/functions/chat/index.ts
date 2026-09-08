// Public endpoint. Streams a chat completion from whatever OpenAI-compatible
// provider is configured in chat_settings/chat_secrets — the client never
// sees the base URL, API key, or system prompt directly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOKENS_CEILING = 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type ClientMessage = { role: "user" | "assistant"; content: string };

// Builds the factual half of the system message from the content tables
// themselves, so chat_settings.system_prompt only ever has to say HOW to
// respond -- tone, boundaries, what to do with off-topic questions -- and
// never has to be hand-edited every time a project or skill changes. This
// runs on every request rather than being cached, trading a few extra ms
// for the CMS content always being current.
function buildContextBlock(
  profile: Record<string, unknown> | null,
  experiences: Record<string, unknown>[],
  projects: Record<string, unknown>[],
  skills: Record<string, unknown>[]
): string {
  const lines: string[] = [];

  if (profile) {
    if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
    if (profile.headline) lines.push(`Headline: ${profile.headline}`);
    if (profile.about_text) lines.push(`About: ${profile.about_text}`);
    if (profile.email) lines.push(`Contact email: ${profile.email}`);
    if (profile.chat_context) lines.push(`Additional notes: ${profile.chat_context}`);
  }

  if (skills.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const s of skills) {
      const category = (String(s.category ?? "").trim() || "Other") as string;
      const list = byCategory.get(category) ?? [];
      list.push(String(s.name));
      byCategory.set(category, list);
    }
    lines.push("", "Skills:");
    for (const [category, names] of byCategory) {
      lines.push(`- ${category}: ${names.join(", ")}`);
    }
  }

  if (experiences.length > 0) {
    lines.push("", "Experience:");
    for (const e of experiences) {
      lines.push(`- ${e.title} at ${e.company_name} (${e.date_label})`);
      for (const point of (e.points as string[] | null) ?? []) {
        lines.push(`  • ${point}`);
      }
    }
  }

  if (projects.length > 0) {
    lines.push("", "Projects:");
    for (const p of projects) {
      const tags = ((p.tags as { name: string }[] | null) ?? [])
        .map((t) => t.name)
        .join(", ");
      const live = p.live_link ? ` (live: ${p.live_link})` : "";
      lines.push(
        `- ${p.name}: ${p.description}${tags ? ` [${tags}]` : ""}${live}`
      );
    }
  }

  return lines.join("\n").trim();
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
  const allowed = await checkRateLimit(
    supabase,
    req,
    "chat",
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS
  );
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests, slow down." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- settings + secret + everything the model should know about Adrian ---
  // Fetched alongside settings/secret rather than gated behind them so one
  // Promise.all covers the whole request; content-table failures degrade to
  // an empty context block (buildContextBlock treats missing data as
  // "nothing to add") rather than failing the whole chat.
  const [
    { data: settings },
    { data: secret },
    { data: profile },
    { data: experiences },
    { data: projects },
    { data: skills },
  ] = await Promise.all([
    supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("chat_secrets").select("api_key").eq("id", 1).maybeSingle(),
    supabase.from("profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("experiences").select("*").order("sort_order"),
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("skills").select("*").order("sort_order"),
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

  // Merged into ONE system message rather than two -- several
  // OpenAI-compatible providers only honor the first "system" role message
  // in the array, so a separate context message would silently be ignored
  // by some of them. settings.system_prompt (edited in the CMS) stays pure
  // behavioral instruction; the context block underneath is assembled fresh
  // from the content tables on every request.
  const contextBlock = buildContextBlock(
    profile,
    experiences ?? [],
    projects ?? [],
    skills ?? []
  );
  let systemContent = contextBlock
    ? `${settings.system_prompt}\n\n---\nReference information about the portfolio owner. Use this to answer questions; do not invent facts that aren't listed here:\n${contextBlock}`
    : settings.system_prompt;

  // Avatar hero mode only: the 3D avatar can perform a few body gestures,
  // triggered by the model emitting an inline tag. The frontend strips
  // these out of the visible reply before it's ever shown/typed (see
  // src/lib/gestureTags.ts) -- GESTURE_NAMES there must stay in sync with
  // the tag names mentioned here.
  if (settings.hero_variant === "avatar") {
    systemContent += `\n\n---\nYou are embodied as an animated 3D avatar. When a reply calls for a body gesture, include exactly one inline tag anywhere in your reply: [gesture:wave] to wave hello/goodbye, [gesture:jumping_jacks] if asked to do jumping jacks or exercise, [gesture:dance] if asked to dance or celebrate. Only use these three exact tag names, only when it genuinely fits, and don't mention the tag itself in your words.`;
  }

  const messages = [
    { role: "system", content: systemContent },
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
