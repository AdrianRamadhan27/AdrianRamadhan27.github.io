// Shared by the `chat` edge function (the forward_question_to_owner tool)
// and `test-email` (the CMS's manual "Send test email" button) -- one
// implementation of the actual EmailJS call so they can't drift.
//
// EmailJS's browser SDK (used by the Contact form, see
// src/components/sections/Contact.tsx) can't be reused server-side -- it's
// built around a same-origin/browser check. Its REST API works from
// anywhere, but a non-browser caller (no Origin header, like an edge
// function) is rejected unless the account has "Allow EmailJS API for
// non-browser applications" enabled AND the request includes the
// account's Private Key as `accessToken` -- see
// https://dashboard.emailjs.com/admin/account/security and
// chat_secrets.emailjs_private_key's comment in schema.sql.
export async function sendOwnerEmail(opts: {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
  toEmail: string;
  toName: string;
  message: string;
  formName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: opts.serviceId,
        template_id: opts.templateId,
        user_id: opts.publicKey,
        accessToken: opts.privateKey,
        // Same template-variable names the Contact form already sends, so
        // the one EmailJS template serves both -- no second template to
        // create and keep in sync.
        template_params: {
          form_name: opts.formName ?? "Portfolio AI Chatbot",
          to_name: opts.toName,
          from_email: "ai-chatbot@no-reply.local",
          to_email: opts.toEmail,
          message: opts.message,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `EmailJS ${res.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}
