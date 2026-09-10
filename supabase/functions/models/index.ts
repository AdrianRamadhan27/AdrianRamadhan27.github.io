// Authenticated-only. Fetches the live model list from whatever provider is
// configured, caches it in model_catalog, and returns it — this is what
// backs the CMS's "Refresh models" buttons so the model fields are
// dropdowns instead of free text.
//
// ?kind=chat (default) | tts selects which catalog to refresh. chat uses
// chat_settings.base_url/model against the plain /models endpoint. tts
// uses chat_settings.voice_base_url and OpenRouter's dedicated filter
// `GET /models?output_modalities=speech` -- that DOES list the real TTS
// models (deepgram, fish-audio, kokoro, gemini-tts, voxtral, ...) and,
// crucially, each entry carries a `supported_voices` string array, which
// is what the CMS turns into the "Voice name" dropdown. The plain
// unfiltered /models catalog does NOT include these (and the older
// output_modalities=audio filter returns only music/omni chat models), so
// the speech filter is essential. A small seed list is still merged in as
// a floor in case the endpoint changes shape; "Test voice" in the CMS
// remains the source of truth for whether an id actually works.
//
// No "stt" kind -- speech-to-text/microphone input was removed; voice here
// is TTS-only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Kind = "chat" | "tts";

// Floor list, merged in only for ids the live speech-filtered /models call
// didn't return (it normally returns all of these and more, WITH voices).
// "Test voice" in the CMS is what actually confirms an id still works.
const TTS_SEED_MODELS = [
  "deepgram/flux-tts:free",
  "fish-audio/s2.1-pro-free:free",
  "hexgrad/kokoro-82m",
  "google/gemini-3.1-flash-tts-preview",
  "minimax/speech-2.8-hd",
  "openai/gpt-4o-mini-tts",
];

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
  const kind: Kind = url.searchParams.get("kind") === "tts" ? "tts" : "chat";

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

  const modelsUrl =
    kind === "tts"
      ? `${baseUrl.replace(/\/$/, "")}/models?output_modalities=speech`
      : `${baseUrl.replace(/\/$/, "")}/models`;

  let upstream = await fetch(modelsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  let usedSpeechFilter = kind === "tts" && upstream.ok;
  // Non-OpenRouter providers may not understand the query param -- retry
  // plain and filter client-side below.
  if (!upstream.ok && kind === "tts") {
    upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    usedSpeechFilter = false;
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Provider rejected the request.", detail: text.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const json = await upstream.json();
  type RawModel = {
    id: string;
    name?: string;
    architecture?: { output_modalities?: string[] };
    supported_voices?: unknown;
  };
  const rawModels: RawModel[] = json.data ?? json.models ?? [];

  type CatalogEntry = { model_id: string; display_name: string; kind: Kind; voices: string[] };
  let models: CatalogEntry[];

  if (kind === "chat") {
    models = rawModels.map((m) => ({
      model_id: m.id,
      display_name: m.id,
      kind,
      voices: [],
    }));
  } else {
    // If we hit the filtered endpoint, trust its list; otherwise keep only
    // models that declare a speech/audio output modality.
    const speechModels = usedSpeechFilter
      ? rawModels
      : rawModels.filter((m) =>
          m.architecture?.output_modalities?.some((x) => x === "speech" || x === "audio")
        );
    const fromApi: CatalogEntry[] = speechModels.map((m) => ({
      model_id: m.id,
      display_name: m.name || m.id,
      kind,
      voices: Array.isArray(m.supported_voices)
        ? (m.supported_voices as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
    }));
    const seen = new Set(fromApi.map((m) => m.model_id));
    models = [
      ...fromApi,
      ...TTS_SEED_MODELS.filter((id) => !seen.has(id)).map((id) => ({
        model_id: id,
        display_name: id,
        kind,
        voices: [] as string[],
      })),
    ];
  }

  models.sort((a, b) => a.model_id.localeCompare(b.model_id));

  if (models.length > 0) {
    await supabase.from("model_catalog").delete().eq("kind", kind);
    const rows = models.map((m) => ({ ...m, fetched_at: new Date().toISOString() }));
    const { error: insertErr } = await supabase.from("model_catalog").insert(rows);
    // `voices` is a newer column -- if the migration hasn't been run the
    // insert 400s on the unknown column; retry without it so the catalog
    // still caches (the CMS dropdown reads voices from THIS response, not
    // the table, so it works either way).
    if (insertErr) {
      await supabase.from("model_catalog").insert(
        rows.map((r) => ({
          model_id: r.model_id,
          display_name: r.display_name,
          kind: r.kind,
          fetched_at: r.fetched_at,
        }))
      );
    }
  }

  return new Response(JSON.stringify({ models }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
