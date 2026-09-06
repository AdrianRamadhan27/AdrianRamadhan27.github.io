// Authenticated-only. Fetches the live model list from whatever provider is
// configured, caches it in model_catalog, and returns it — this is what
// backs the CMS's "Refresh models" button so the model field is a dropdown
// instead of free text.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: settings }, { data: secret }] = await Promise.all([
    supabase.from("chat_settings").select("base_url").eq("id", 1).maybeSingle(),
    supabase.from("chat_secrets").select("api_key").eq("id", 1).maybeSingle(),
  ]);

  if (!settings?.base_url || !secret?.api_key) {
    return new Response(
      JSON.stringify({ error: "Set a base URL and API key first." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const upstream = await fetch(`${settings.base_url.replace(/\/$/, "")}/models`, {
    headers: { Authorization: `Bearer ${secret.api_key}` },
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Provider rejected the request.", detail: text.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const json = await upstream.json();
  const rawModels: Array<{ id: string }> = json.data ?? json.models ?? [];

  const models = rawModels
    .map((m) => ({ model_id: m.id, display_name: m.id }))
    .sort((a, b) => a.model_id.localeCompare(b.model_id));

  if (models.length > 0) {
    await supabase.from("model_catalog").delete().neq("model_id", "");
    await supabase.from("model_catalog").insert(
      models.map((m) => ({ ...m, fetched_at: new Date().toISOString() }))
    );
  }

  return new Response(JSON.stringify({ models }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
