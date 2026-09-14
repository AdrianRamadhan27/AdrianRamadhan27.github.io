// Authenticated-only. Backs the CMS's "Send test email" button (Chatbot
// tab, Email forwarding section) -- saves nothing, just sends one real
// email through the currently-saved EmailJS config so "does this actually
// work" is a five-second check instead of waiting for the AI to decide to
// call the tool. Reuses the exact same sendOwnerEmail the `chat` edge
// function's forward_question_to_owner tool calls, so a working test here
// really does mean the tool will work too.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";
import { sendOwnerEmail } from "../_shared/emailjs.ts";

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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const [{ data: settings }, { data: secret }, { data: profile }] = await Promise.all([
    supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("chat_secrets").select("emailjs_private_key").eq("id", 1).maybeSingle(),
    supabase.from("profile").select("full_name, email").eq("id", 1).maybeSingle(),
  ]);

  const toEmail = String(profile?.email ?? "").trim();
  const serviceId = String(settings?.emailjs_service_id ?? "").trim();
  const templateId = String(settings?.emailjs_template_id ?? "").trim();
  const publicKey = String(settings?.emailjs_public_key ?? "").trim();
  const privateKey = String(secret?.emailjs_private_key ?? "").trim();

  const missing = [
    !serviceId && "Service ID",
    !templateId && "Template ID",
    !publicKey && "Public Key",
    !privateKey && "Private Key",
    !toEmail && "profile email (Profile tab)",
  ].filter(Boolean);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Not fully configured -- missing: ${missing.join(", ")}.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await sendOwnerEmail({
    serviceId,
    templateId,
    publicKey,
    privateKey,
    toEmail,
    toName: String(profile?.full_name ?? "there"),
    formName: "Portfolio AI Chatbot (test)",
    message:
      "This is a test of the AI chatbot's email-forwarding tool, sent from the CMS's " +
      '"Send test email" button -- no visitor actually asked this. If you got this, ' +
      "the chatbot can successfully forward questions it can't answer straight to this inbox.",
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, to: toEmail }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
