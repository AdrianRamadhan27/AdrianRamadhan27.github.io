export type ChatMessage = { role: "user" | "assistant"; content: string };

// Streams a response from the `chat` edge function (which itself proxies an
// OpenAI-compatible /chat/completions SSE stream) and calls onDelta with each
// incremental chunk of assistant text as it arrives.
export async function streamChat(
  history: ChatMessage[],
  onDelta: (chunk: string) => void
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");

  // Supabase Edge Functions require a valid Authorization header by default
  // (JWT verification is on unless a function explicitly opts out), even
  // for a function meant to be fully public. The anon key is a valid JWT
  // and is designed to be public, so it satisfies that check here.
  const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ messages: history }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let message = "The chatbot is unavailable right now.";
    try {
      message = JSON.parse(text).error ?? message;
    } catch {
      /* not JSON, keep default message */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // ignore malformed/partial SSE lines
      }
    }
  }
}
