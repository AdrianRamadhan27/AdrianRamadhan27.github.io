export type ChatMessage = { role: "user" | "assistant"; content: string };

// Streams a response from the `chat` edge function (which itself proxies an
// OpenAI-compatible /chat/completions SSE stream) and calls onDelta with each
// incremental chunk of assistant text as it arrives.
export async function streamChat(
  history: ChatMessage[],
  onDelta: (chunk: string) => void
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase is not configured.");

  const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
