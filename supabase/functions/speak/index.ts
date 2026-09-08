// Public endpoint (same trust model as `chat`: protected by the platform's
// default JWT check -- satisfied by the anon key -- plus its own rate
// limit, not by requireUser). Synthesizes speech for the avatar hero via
// whatever OpenAI-compatible TTS endpoint is configured and streams the
// bytes back AS THEY ARRIVE (upstream.body is piped straight through
// below, not buffered) so the client can start playing audio before the
// full reply has finished generating -- see src/lib/audioStreamPlayer.ts.
//
// response_format is explicitly "mp3" -- an earlier version requested
// "pcm" on the (OpenAI) assumption that a TTS endpoint honors it, but
// probing the live OpenRouter endpoint directly showed it ignores that and
// always returns real MP3 regardless (Content-Type: audio/mpeg, bytes
// starting with the FF FB MP3 frame-sync header); requesting raw PCM while
// actually receiving MP3 is what made the client play static. This
// function just pipes whatever bytes/Content-Type come back straight
// through either way -- audioStreamPlayer.ts decodes real MP3 via
// decodeAudioData, so if a differently-configured provider ever does
// return true headerless PCM instead, playback would need to change
// there too. The client never sees the base URL, model, or key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// TTS is the real cost/abuse surface here (unlike free-tier text chat, some
// providers meter audio output by the token/character) -- capped well
// below a typical chat reply's length and rate-limited independently of
// the `chat` bucket so a burst of voice replies can't also exhaust the
// text-only visitor's budget.
const MAX_INPUT_CHARS = 600;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const allowed = await checkRateLimit(
    supabase,
    req,
    "tts",
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS
  );
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests, slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [{ data: settings }, { data: secret }] = await Promise.all([
    supabase
      .from("chat_settings")
      .select("voice_enabled, voice_base_url, tts_model, tts_voice")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("chat_secrets").select("api_key, voice_api_key").eq("id", 1).maybeSingle(),
  ]);

  if (!settings?.voice_enabled) {
    return new Response(JSON.stringify({ error: "Voice is not enabled." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Falls back to the chat key when no separate voice key is set -- one
  // OpenRouter key commonly covers chat + TTS + STT (see schema.sql).
  const apiKey = secret?.voice_api_key || secret?.api_key;
  if (!apiKey || !settings.voice_base_url || !settings.tts_model) {
    return new Response(JSON.stringify({ error: "Voice is not fully configured yet." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = (body.text ?? "").trim().slice(0, MAX_INPUT_CHARS);
  if (!text) {
    return new Response(JSON.stringify({ error: "text is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `${settings.voice_base_url.replace(/\/$/, "")}/audio/speech`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.tts_model,
        input: text,
        voice: settings.tts_voice || undefined,
        response_format: "mp3",
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Upstream provider error.", detail: detail.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
    },
  });
});
