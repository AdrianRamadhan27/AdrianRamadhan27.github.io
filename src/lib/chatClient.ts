export type ChatMessage = { role: "user" | "assistant"; content: string };

// Streams a response from the `chat` edge function (which itself proxies an
// OpenAI-compatible /chat/completions SSE stream) and calls onDelta with each
// incremental chunk of assistant text as it arrives.
//
// `signal` supports voice barge-in (the avatar hero's mic button can cut off
// an in-flight reply): an abort during fetch or mid-stream rejects with a
// DOMException named "AbortError" -- callers that want silent cancellation
// (no error bubble shown to the visitor) should check `e.name === "AbortError"`
// rather than treating it like a real failure.
export async function streamChat(
  history: ChatMessage[],
  onDelta: (chunk: string) => void,
  opts: { signal?: AbortSignal } = {}
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
    signal: opts.signal,
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
  // Some providers (seen with certain OpenRouter free-tier models) return a
  // 200 and a well-formed SSE stream that never carries any actual content
  // -- no error, just an empty completion (rate-limited/overloaded backend
  // silently serving nothing rather than failing loudly). Without this,
  // that renders as a blank chat bubble with no indication anything is
  // wrong; track whether anything ever arrived so it can be surfaced as a
  // real error instead.
  let receivedAny = false;

  const finish = () => {
    if (!receivedAny) {
      throw new Error(
        "The model returned an empty response -- it may be overloaded or rate-limited. Try again or pick a different model."
      );
    }
  };

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
      if (payload === "[DONE]") {
        finish();
        return;
      }

      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          receivedAny = true;
          onDelta(delta);
        }
      } catch {
        // ignore malformed/partial SSE lines
      }
    }
  }

  finish();
}
