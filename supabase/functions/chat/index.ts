// Public endpoint. Streams a chat completion from whatever OpenAI-compatible
// provider is configured in chat_settings/chat_secrets — the client never
// sees the base URL, API key, or system prompt directly.
//
// Tool-calling, not a full context dump: the system prompt only carries a
// compact DIRECTORY of experience/project titles + their index -- full
// details (bullet points, descriptions, links) are fetched on demand via
// get_experience(index)/get_project(index) tool calls (Python-style
// negative indices supported: get_project(-1) is the most recent project).
// Previously every experience's full points and every project's full
// description were inlined into the system prompt on EVERY request
// regardless of whether the question needed any of it -- a large prefill
// the model has to process before producing a first token, on every single
// message. Most questions ("what's your name", "are you free to chat")
// need none of that detail at all; the ones that do trigger one or two
// small, fast tool round-trips instead of paying that cost unconditionally.
// See toolLoop.ts for the actual SSE-parsing/round-trip orchestration
// (factored out specifically so it has no Deno-specific imports and can be
// exercised directly by a plain Node test script).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { sendOwnerEmail } from "../_shared/emailjs.ts";
import {
  callUpstream,
  continueChatCompletion,
  pickByIndex,
  type ToolDefinition,
  type UpstreamMessage,
} from "./toolLoop.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOKENS_CEILING = 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
// Separate, much tighter budget for the email tool specifically -- it's
// real-world side effects (an email actually landing in the owner's
// inbox), not just tokens, so it gets its own bucket independent of the
// per-message chat limit above.
const EMAIL_FORWARD_WINDOW_MS = 60 * 60_000;
const EMAIL_FORWARD_MAX_REQUESTS = 3;

type ClientMessage = { role: "user" | "assistant"; content: string };

const BASE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_experience",
      description:
        "Fetch full details (all bullet points) for ONE work-experience entry from the Experience directory listed in the system prompt, by its index. Call this before answering anything that needs specifics beyond the title/company/date already shown there. Negative indices count from the end (-1 = the most recent/last entry).",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description:
              "0-based index from the Experience directory, or negative to count from the end (-1 = last).",
          },
        },
        required: ["index"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description:
        "Fetch full details (description, tags, links) for ONE project from the Projects directory listed in the system prompt, by its index. Call this before answering anything that needs specifics beyond the name already shown there. Negative indices count from the end (-1 = the most recent/last entry).",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description:
              "0-based index from the Projects directory, or negative to count from the end (-1 = last).",
          },
        },
        required: ["index"],
      },
    },
  },
];

// Only ever appended to BASE_TOOLS when email forwarding is fully
// configured (see emailForwardConfigured in the handler below) -- the
// model is never even offered a tool that would just fail if called.
const EMAIL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "forward_question_to_owner",
    description:
      "Sends the visitor's question directly to the portfolio owner's email inbox. Use this ONLY for something you genuinely cannot answer from the reference information above -- not covered by the profile/experience/projects/skills, or something only the owner can personally decide (availability, rates, scheduling, an opinion not documented here, etc.). Call it at most once per question, with the visitor's question close to verbatim. After it returns ok:true, tell the visitor you've forwarded their question and the owner will follow up -- never say this unless the tool actually returned ok:true. If it returns ok:false, apologize and point them to the site's Contact section instead; do not claim you forwarded anything.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The visitor's question, close to verbatim.",
        },
        reason: {
          type: "string",
          description: "One short phrase on why you couldn't answer it yourself.",
        },
      },
      required: ["question"],
    },
  },
};

// The compact half of the system message -- profile/skills/socials stay
// inlined (already small), experiences/projects are listed as a directory
// only (index + the one identifying line), full detail comes from a tool
// call.
function buildDirectoryBlock(
  profile: Record<string, unknown> | null,
  experiences: Record<string, unknown>[],
  projects: Record<string, unknown>[],
  skills: Record<string, unknown>[],
  socials: Record<string, unknown>[]
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
    lines.push(
      "",
      "Experience directory (call get_experience(index) for full bullet points on any entry; -1 = most recent):"
    );
    experiences.forEach((e, i) => {
      lines.push(`[${i}] ${e.title} at ${e.company_name} (${e.date_label})`);
    });
  }

  if (projects.length > 0) {
    lines.push(
      "",
      "Projects directory (call get_project(index) for description/tags/links on any entry; -1 = most recent):"
    );
    projects.forEach((p, i) => {
      lines.push(`[${i}] ${p.name}`);
    });
  }

  if (socials.length > 0) {
    // Inlined directly (label + URL), not tool-called like
    // experiences/projects -- there are only ever a handful of these and
    // each one is already just one short line, so a round-trip indirection
    // would cost more than it saves.
    lines.push("", "Social / profile links:");
    socials.forEach((s) => {
      lines.push(`- ${s.label}: ${s.url}`);
    });
  }

  return lines.join("\n").trim();
}

async function executeTool(
  name: string,
  argsJson: string,
  ctx: {
    experiences: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    profile: Record<string, unknown> | null;
    settings: Record<string, unknown>;
    secret: Record<string, unknown> | null;
    supabase: SupabaseClient;
    req: Request;
  }
): Promise<string> {
  let args: { index?: number; question?: string; reason?: string } = {};
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    // fall through with empty args -- reported as an out-of-range error below
  }
  const index = typeof args.index === "number" ? args.index : NaN;

  if (name === "get_experience") {
    const e = pickByIndex(ctx.experiences, index);
    if (!e) {
      return JSON.stringify({
        error: `No experience at index ${args.index}. Valid indices: 0 to ${ctx.experiences.length - 1} (or -1 to -${ctx.experiences.length}).`,
      });
    }
    return JSON.stringify({
      title: e.title,
      company: e.company_name,
      date: e.date_label,
      points: e.points ?? [],
    });
  }

  if (name === "get_project") {
    const p = pickByIndex(ctx.projects, index);
    if (!p) {
      return JSON.stringify({
        error: `No project at index ${args.index}. Valid indices: 0 to ${ctx.projects.length - 1} (or -1 to -${ctx.projects.length}).`,
      });
    }
    const tags = ((p.tags as { name: string }[] | null) ?? []).map((t) => t.name);
    return JSON.stringify({
      name: p.name,
      description: p.description,
      tags,
      live_link: p.live_link ?? null,
      source_code_link: p.source_code_link ?? null,
    });
  }

  if (name === "forward_question_to_owner") {
    const question = String(args.question ?? "").slice(0, 1000).trim();
    if (!question) {
      return JSON.stringify({ ok: false, error: "question is required" });
    }

    // Independent, tighter budget than the per-message chat rate limit --
    // this has a real side effect (an actual email), not just tokens.
    const allowed = await checkRateLimit(
      ctx.supabase,
      ctx.req,
      "email-forward",
      EMAIL_FORWARD_WINDOW_MS,
      EMAIL_FORWARD_MAX_REQUESTS
    );
    if (!allowed) {
      return JSON.stringify({
        ok: false,
        error: "Forwarding limit reached for now. Do not tell the visitor it was forwarded -- apologize and suggest the Contact section instead.",
      });
    }

    const toEmail = String(ctx.profile?.email ?? "").trim();
    const toName = String(ctx.profile?.full_name ?? "the portfolio owner");
    const reason = String(args.reason ?? "").trim();
    const result = await sendOwnerEmail({
      serviceId: String(ctx.settings.emailjs_service_id ?? ""),
      templateId: String(ctx.settings.emailjs_template_id ?? ""),
      publicKey: String(ctx.settings.emailjs_public_key ?? ""),
      privateKey: String(ctx.secret?.emailjs_private_key ?? ""),
      toEmail,
      toName,
      message:
        `A visitor asked your portfolio's AI chatbot a question it couldn't answer:\n\n` +
        `"${question}"\n\n` +
        `(Why it couldn't answer: ${reason || "not covered in the information it has"})`,
    });
    return JSON.stringify(result);
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// The human-readable "…" line shown in the chat UI while a tool call runs.
// Resolves the index against the real directory so it can name the entry
// ("Looking up my most recent role", "Looking up the Applicient project")
// rather than a generic "reading a record".
function describeToolCall(
  name: string,
  argsJson: string,
  experiences: Record<string, unknown>[],
  projects: Record<string, unknown>[]
): string {
  let index = NaN;
  try {
    const parsed = JSON.parse(argsJson || "{}");
    if (typeof parsed.index === "number") index = parsed.index;
  } catch {
    /* generic label below */
  }

  if (name === "get_experience") {
    const e = pickByIndex(experiences, index);
    const title = e ? String(e.title ?? "") : "";
    const company = e ? String(e.company_name ?? "") : "";
    if (title && company) return `Looking up ${title} at ${company}`;
    if (index === -1) return "Looking up my most recent role";
    return "Looking up my work experience";
  }
  if (name === "get_project") {
    const p = pickByIndex(projects, index);
    const projectName = p ? String(p.name ?? "") : "";
    if (projectName) return `Looking up the ${projectName} project`;
    if (index === -1) return "Looking up my latest project";
    return "Looking up my projects";
  }
  if (name === "forward_question_to_owner") return "Forwarding your question";
  return "Looking something up";
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
  // an empty directory block (buildDirectoryBlock treats missing data as
  // "nothing to add") rather than failing the whole chat.
  const [
    { data: settings },
    { data: secret },
    { data: profile },
    { data: experiences },
    { data: projects },
    { data: skills },
    { data: socials },
  ] = await Promise.all([
    supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("chat_secrets")
      .select("api_key, emailjs_private_key")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("experiences").select("*").order("sort_order"),
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("socials").select("*").order("sort_order"),
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

  const experiencesArr = experiences ?? [];
  const projectsArr = projects ?? [];

  // Merged into ONE system message rather than two -- several
  // OpenAI-compatible providers only honor the first "system" role message
  // in the array, so a separate context message would silently be ignored
  // by some of them. settings.system_prompt (edited in the CMS) stays pure
  // behavioral instruction; the directory block underneath is assembled
  // fresh from the content tables on every request.
  const directoryBlock = buildDirectoryBlock(
    profile,
    experiencesArr,
    projectsArr,
    skills ?? [],
    socials ?? []
  );
  let systemContent = directoryBlock
    ? `${settings.system_prompt}\n\n---\nReference information about the portfolio owner. Use this to answer questions; do not invent facts that aren't listed here. Full experience/project details aren't inlined below -- call the get_experience/get_project tools for those:\n${directoryBlock}`
    : settings.system_prompt;

  // Avatar hero mode only: the 3D avatar can perform a few body gestures,
  // triggered by the model emitting an inline tag. The frontend strips
  // these out of the visible reply before it's ever shown/typed (see
  // src/lib/gestureTags.ts) -- GESTURE_NAMES there must stay in sync with
  // the tag names mentioned here.
  if (settings.hero_variant === "avatar") {
    systemContent += `\n\n---\nYou are embodied as an animated 3D avatar. When a reply calls for a body gesture, include exactly one inline tag anywhere in your reply: [gesture:wave] to wave hello/goodbye, [gesture:jumping_jacks] if asked to do jumping jacks or exercise, [gesture:dance] if asked to dance or celebrate. Only use these three exact tag names, only when it genuinely fits, and don't mention the tag itself in your words.`;
  }

  // The email tool is only ever offered to the model when it would
  // actually work -- all four EmailJS values present and a destination
  // address to send to -- so the model is never told about a tool that
  // would just fail if it tried calling it.
  const ownerEmail = String((profile as Record<string, unknown> | null)?.email ?? "").trim();
  const ownerName = String((profile as Record<string, unknown> | null)?.full_name ?? "").trim();
  const emailForwardConfigured =
    !!settings.email_forward_enabled &&
    !!String(settings.emailjs_service_id ?? "").trim() &&
    !!String(settings.emailjs_template_id ?? "").trim() &&
    !!String(settings.emailjs_public_key ?? "").trim() &&
    !!String(secret.emailjs_private_key ?? "").trim() &&
    !!ownerEmail;

  if (emailForwardConfigured) {
    systemContent += `\n\n---\nIf a visitor asks something you genuinely cannot answer from the reference information above -- not covered by the profile/experience/projects/skills, or something only ${ownerName || "the portfolio owner"} can personally decide (availability, rates, scheduling, an opinion not documented here, etc.) -- call forward_question_to_owner with their question. Once it returns ok:true, tell the visitor you've forwarded their question to ${ownerName || "the owner"} and they'll follow up -- never say this unless the tool actually returned ok:true. If it returns ok:false, apologize and point them to the site's Contact section instead; do not claim you forwarded anything.`;
  }

  const tools: ToolDefinition[] = emailForwardConfigured
    ? [...BASE_TOOLS, EMAIL_TOOL]
    : BASE_TOOLS;

  const messages: UpstreamMessage[] = [{ role: "system", content: systemContent }, ...history];

  const maxTokens = Math.min(settings.max_tokens ?? 400, MAX_TOKENS_CEILING);
  const url = `${settings.base_url.replace(/\/$/, "")}/chat/completions`;
  const temperature = settings.temperature ?? 0.7;

  // --- first upstream call happens here, BEFORE the client-facing Response
  // exists -- so if it fails (bad key, bad model, provider down), this can
  // still report a clean non-200 JSON error exactly like the pre-tool-
  // calling version did. Only failures on LATER rounds (after streaming has
  // already committed to a 200) fall back to just stopping quietly --
  // see toolLoop.ts's doc comment on continueChatCompletion.
  const first = await callUpstream(fetch, url, secret.api_key, {
    model: settings.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    tools,
    tool_choice: "auto",
  });

  if (!first.ok) {
    return new Response(
      JSON.stringify({ error: "Upstream provider error.", detail: first.detail }),
      { status: first.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await continueChatCompletion({
          fetchImpl: fetch,
          url,
          apiKey: secret.api_key,
          model: settings.model,
          temperature,
          maxTokens,
          tools,
          executeTool: (name, argsJson) =>
            executeTool(name, argsJson, {
              experiences: experiencesArr,
              projects: projectsArr,
              profile,
              settings,
              secret,
              supabase,
              req,
            }),
          describeTool: (name, argsJson) =>
            describeToolCall(name, argsJson, experiencesArr, projectsArr),
          onContentChunk: (text) => {
            const frame = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
            controller.enqueue(encoder.encode(frame));
          },
          onStatus: (event) => {
            // Distinct frame shape from a content delta -- the client
            // (chatClient.ts) routes on `status` vs `choices[].delta`.
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status: event })}\n\n`)
            );
          },
          messages,
          firstResponse: first.response,
          firstUsedTools: first.usedTools,
        });
      } catch {
        // Best-effort -- an upstream network hiccup mid-stream just ends
        // the reply early rather than crashing the function; the client's
        // own empty-response handling (chatClient.ts) covers the case
        // where nothing was ever sent.
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
