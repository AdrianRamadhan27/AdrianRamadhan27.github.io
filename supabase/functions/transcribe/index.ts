// Public endpoint (same trust model as `chat`/`speak`: platform JWT check
// satisfied by the anon key, plus its own rate limit). Transcribes a short
// voice recording via whatever OpenAI-compatible STT endpoint is
// configured -- the fallback capture path (see src/lib/voiceClient.ts)
// for browsers without native SpeechRecognition, chiefly Firefox.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ~1.5 MB covers roughly 30s of compressed (Opus/WebM) mic audio, which is
// already generous for a chatbot question -- rejecting oversized payloads
// up front avoids proxying a large upload just to have the provider reject it.
const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

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
    "stt",
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
      .select("voice_enabled, voice_base_url, stt_model")
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

  const apiKey = secret?.voice_api_key || secret?.api_key;
  if (!apiKey || !settings.voice_base_url || !settings.stt_model) {
    return new Response(JSON.stringify({ error: "Voice is not fully configured yet." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let incomingForm: FormData;
  try {
    incomingForm = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const audio = incomingForm.get("audio");
  if (!(audio instanceof File) && !(audio instanceof Blob)) {
    return new Response(JSON.stringify({ error: "audio field is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return new Response(JSON.stringify({ error: "Audio too large." }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Re-packaged with the field names the OpenAI-compatible transcription
  // API actually expects ("file", not "audio") rather than passing the
  // client's form straight through.
  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "speech.webm");
  upstreamForm.append("model", settings.stt_model);

  const upstream = await fetch(
    `${settings.voice_base_url.replace(/\/$/, "")}/audio/transcriptions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    }
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Upstream provider error.", detail: detail.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const json = await upstream.json().catch(() => ({}));
  const text = typeof json.text === "string" ? json.text : "";

  return new Response(JSON.stringify({ text }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
