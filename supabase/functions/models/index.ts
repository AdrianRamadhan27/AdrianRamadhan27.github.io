// Authenticated-only. Fetches the live model list from whatever provider is
// configured, caches it in model_catalog, and returns it — this is what
// backs the CMS's "Refresh models" buttons so the model fields are
// dropdowns instead of free text.
//
// ?kind=chat (default) | tts | stt selects which catalog to refresh. chat
// uses chat_settings.base_url/model against the plain /models endpoint,
// same as before this file grew voice support. tts/stt use
// chat_settings.voice_base_url and filter by architecture modality --
// except OpenRouter's public /models catalog does NOT list its dedicated
// audio-in/audio-out models (verified empirically while building this: 0 of
// 428 chat models matched known TTS ids, and the modality filters return
// only OTHER chat models that happen to accept/emit audio, not the
// dedicated speech models). So known model ids are seeded in below and
// merged with whatever the API does return, keeping the dropdown useful
// regardless of what that endpoint covers on any given day. The CMS's
// "Test voice" button is the actual source of truth for whether a given
// model id really works.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Kind = "chat" | "tts" | "stt";

// Best-effort seed, not guaranteed current -- OpenRouter's audio model
// lineup isn't enumerable through /models as of this writing. "Test voice"
// in the CMS is what actually confirms a given id still works.
const SEED_MODELS: Record<Exclude<Kind, "chat">, string[]> = {
  tts: [
    "deepgram/flux-tts:free",
    "fish-audio/s2.1-pro-free:free",
    "hexgrad/kokoro-82m",
    "google/gemini-3.1-flash-tts-preview",
    "openai/gpt-4o-mini-tts",
    "openai/gpt-audio-mini",
  ],
  stt: [
    "openai/whisper-large-v3-turbo",
    "openai/gpt-4o-mini-transcribe",
    "deepgram/nova-3",
    "google/chirp-3",
  ],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const kind: Kind = kindParam === "tts" || kindParam === "stt" ? kindParam : "chat";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: settings }, { data: secret }] = await Promise.all([
    supabase
      .from("chat_settings")
      .select("base_url, voice_base_url")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("chat_secrets").select("api_key, voice_api_key").eq("id", 1).maybeSingle(),
  ]);

  const baseUrl = kind === "chat" ? settings?.base_url : settings?.voice_base_url;
  // Voice falls back to the chat key when no separate voice key is set --
  // one OpenRouter key commonly covers both, per schema.sql's comment.
  const apiKey = kind === "chat" ? secret?.api_key : secret?.voice_api_key || secret?.api_key;

  if (!baseUrl || !apiKey) {
    return new Response(
      JSON.stringify({ error: "Set a base URL and API key first." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Provider rejected the request.", detail: text.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const json = await upstream.json();
  type RawModel = { id: string; architecture?: { input_modalities?: string[]; output_modalities?: string[] } };
  const rawModels: RawModel[] = json.data ?? json.models ?? [];

  let ids: string[];
  if (kind === "chat") {
    ids = rawModels.map((m) => m.id);
  } else if (kind === "tts") {
    ids = rawModels
      .filter((m) => m.architecture?.output_modalities?.includes("audio"))
      .map((m) => m.id);
  } else {
    ids = rawModels
      .filter((m) => m.architecture?.input_modalities?.includes("audio"))
      .map((m) => m.id);
  }

  if (kind !== "chat") {
    // Merge the curated seed in -- see the file-level comment on why the
    // API alone under-reports audio models. Dedup, seed models first since
    // they're the ones actually worth surfacing.
    const seen = new Set(SEED_MODELS[kind]);
    ids = [...SEED_MODELS[kind], ...ids.filter((id) => !seen.has(id))];
  }

  const models = ids
    .map((id) => ({ model_id: id, display_name: id, kind }))
    .sort((a, b) => a.model_id.localeCompare(b.model_id));

  if (models.length > 0) {
    await supabase.from("model_catalog").delete().eq("kind", kind);
    await supabase.from("model_catalog").insert(
      models.map((m) => ({ ...m, fetched_at: new Date().toISOString() }))
    );
  }

  return new Response(JSON.stringify({ models }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
