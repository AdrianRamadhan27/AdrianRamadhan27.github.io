// Authenticated-only. The only way chat_secrets.api_key or voice_api_key is
// ever written — the CMS posts the new key here instead of writing the
// table directly, so neither key ever needs a client-facing RLS policy.
// `field` selects which column (default "api_key"), whitelisted against a
// fixed set rather than accepted as an arbitrary column name.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { api_key?: string; field?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = (body.api_key ?? "").trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "api_key is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ALLOWED_FIELDS = ["api_key", "voice_api_key"] as const;
  const field = ALLOWED_FIELDS.includes(body.field as (typeof ALLOWED_FIELDS)[number])
    ? (body.field as (typeof ALLOWED_FIELDS)[number])
    : "api_key";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("chat_secrets")
    .upsert({ id: 1, [field]: apiKey });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
