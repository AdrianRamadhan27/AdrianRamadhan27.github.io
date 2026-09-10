// Pure SSE-parsing/tool-calling orchestration for the `chat` edge function,
// factored out of index.ts specifically so it has zero Deno-specific
// imports (no "npm:..." specifiers, no Deno global) -- every dependency
// (fetch, ReadableStream, TextDecoder/TextEncoder) is a standard Web API
// available in both Deno and Node, which lets this file's logic be
// exercised directly by a plain Node test script instead of only ever
// being verified by deploying it.
//
// Why tool-calling at all: the previous version of `chat` always inlined
// every experience's full bullet points and every project's full
// description into the system prompt on EVERY request, regardless of
// whether the question needed any of it -- a large prefill the model has
// to process before it can produce a first token, on every single message.
// Instead, the system prompt now carries only a compact directory (titles/
// names + their index), and the model calls get_experience(index)/
// get_project(index) -- Python-style negative indices supported, so
// get_project(-1) is "the most recent project" -- to pull full details
// only for the specific entries a question actually needs.

export type UpstreamToolCall = { id: string; name: string; arguments: string };

// Progress events pushed to the client-facing stream alongside content, so
// the chat UI can show "Thinking…" / "Looking up work experience…" instead
// of an inscrutable blinking cursor during the (potentially multi-second)
// tool round-trips -- see continueChatCompletion + index.ts's onStatus.
export type StatusEvent = { kind: "thinking" | "tool"; label: string };

export type UpstreamMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ToolCallWire[] }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCallWire = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ToolExecutor = (name: string, argsJson: string) => string;

const MAX_TOOL_ROUNDS = 4;

export function toolCallWireFrom(call: UpstreamToolCall): ToolCallWire {
  return { id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } };
}

// Parses one upstream SSE response body, forwarding content deltas live via
// onContentChunk (true streaming -- the caller can pipe these straight to
// its own client-facing SSE as they arrive, not buffered) while separately
// accumulating any tool_calls deltas, which OpenAI-compatible providers
// spread across many chunks (an id/name once, then argument fragments) and
// key by a per-response `index` since a model can request multiple tool
// calls in parallel.
export async function pumpStream(
  body: ReadableStream<Uint8Array>,
  onContentChunk: (text: string) => void
): Promise<{ contentSeen: boolean; toolCalls: UpstreamToolCall[] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let contentSeen = false;
  const toolCallsByIndex = new Map<number, { id?: string; name?: string; arguments: string }>();

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
      if (payload === "[DONE]") continue;

      let json: {
        choices?: {
          delta?: {
            content?: string | null;
            tool_calls?: {
              index?: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
        }[];
      };
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // malformed/partial line -- same tolerance as the client's own parser
      }

      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;

      if (typeof delta.content === "string" && delta.content.length > 0) {
        contentSeen = true;
        onContentChunk(delta.content);
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const entry = toolCallsByIndex.get(idx) ?? { arguments: "" };
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.arguments += tc.function.arguments;
          toolCallsByIndex.set(idx, entry);
        }
      }
    }
  }

  const toolCalls: UpstreamToolCall[] = [];
  for (const entry of toolCallsByIndex.values()) {
    if (entry.id && entry.name) {
      toolCalls.push({ id: entry.id, name: entry.name, arguments: entry.arguments || "{}" });
    }
  }
  return { contentSeen, toolCalls };
}

export type UpstreamCallResult =
  | { ok: true; response: Response; usedTools: boolean }
  | { ok: false; status: number; detail: string };

// One request to the provider's /chat/completions, with a single built-in
// fallback: some models proxied through a provider like OpenRouter reject
// the request outright when `tools` is present at all (no function-calling
// support). Rather than fail the whole reply over that, retry once without
// tools -- degrading gracefully to the old "just answer from the directory
// alone" behavior for that one model, instead of a hard error.
//
// stream: true is REQUIRED here -- pumpStream (below) only understands an
// SSE body ("data: {...}" lines, a trailing "data: [DONE]"). Without this
// flag an OpenAI-compatible provider returns one plain JSON object instead,
// which contains no line starting with "data:" at all, so pumpStream finds
// zero content deltas and zero tool-call deltas on every single request --
// not a provider/model problem, and not a partial failure either: every
// reply came back completely empty and silently, since a content-free
// response is indistinguishable from "the model chose to say nothing" (see
// continueChatCompletion's own doc comment on that). Confirmed directly:
// this was missing, live-tested end to end against the deployed function
// both before and after adding it.
export async function callUpstream(
  fetchImpl: typeof fetch,
  url: string,
  apiKey: string,
  body: {
    model: string;
    messages: UpstreamMessage[];
    temperature: number;
    max_tokens: number;
    tools?: ToolDefinition[];
    tool_choice?: "auto" | "none";
  }
): Promise<UpstreamCallResult> {
  const attempt = async (withTools: boolean) => {
    const payload = withTools
      ? { ...body, stream: true }
      : { ...body, tools: undefined, tool_choice: undefined, stream: true };
    return fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
  };

  const hasTools = !!body.tools && body.tools.length > 0;
  let res = await attempt(hasTools);
  let usedTools = hasTools;

  if (!res.ok && hasTools) {
    res = await attempt(false);
    usedTools = false;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status || 502, detail: detail.slice(0, 500) };
  }

  return { ok: true, response: res, usedTools };
}

// Drives the tool-call round-trip loop starting from an ALREADY-FETCHED
// first response (see index.ts: the very first upstream call happens
// before the client-facing Response/stream is created at all, so a
// same-round failure can still be reported as a clean non-200 JSON error
// exactly like the pre-tool-calling version did; every later round's
// failure, by contrast, happens after streaming has already committed to
// a 200, so it just stops quietly -- the existing client already treats a
// content-free stream as "the model returned an empty response").
//
// Each round's content is BUFFERED, not forwarded live: a round either
// ends in tool calls or in the real answer, and we can't tell which until
// its stream finishes. Many models narrate ("Let me check my most recent
// role…") right before emitting a tool call in the same turn -- forwarding
// that live meant the visitor saw the narration and then, because the old
// `contentSeen` short-circuit treated any content as "answer done", the
// reply just stopped there and the tool call was silently dropped. Now a
// round that ends in tool calls has its buffered narration discarded and
// replaced with a status line; only a round that ends WITHOUT tool calls
// flushes its buffer as the answer. Not streaming the network
// chunk-by-chunk is invisible here: the client reveals text with a
// typewriter whose pace is already decoupled from arrival, and replies
// are capped at ~1k tokens.
export async function continueChatCompletion(opts: {
  fetchImpl: typeof fetch;
  url: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: ToolDefinition[];
  executeTool: ToolExecutor;
  onContentChunk: (text: string) => void;
  /** Progress updates for the UI (see StatusEvent). Optional so a plain
   *  Node test of this file can omit it. */
  onStatus?: (event: StatusEvent) => void;
  /** Turns a tool call into the human label shown while it runs, e.g.
   *  get_experience(-1) -> "Looking up my most recent role". index.ts
   *  supplies this since it owns what the tools mean. */
  describeTool?: (name: string, argsJson: string) => string;
  messages: UpstreamMessage[];
  firstResponse: Response;
  firstUsedTools: boolean;
}): Promise<void> {
  let response = opts.firstResponse;
  let usedTools = opts.firstUsedTools;
  const messages = opts.messages.slice();

  opts.onStatus?.({ kind: "thinking", label: "Thinking" });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (!response.body) return;

    let roundText = "";
    const { toolCalls } = await pumpStream(response.body, (t) => {
      roundText += t;
    });

    if (toolCalls.length === 0) {
      // No tool calls -> this round's text IS the answer (or it's an empty
      // completion, in which case flushing "" is a no-op and the client
      // surfaces its own "empty response" error).
      if (roundText) opts.onContentChunk(roundText);
      return;
    }

    // This WAS the last iteration the loop will ever process -- don't fetch
    // a round nothing will read. Without this guard, a provider that
    // ignores tool_choice:"none" (still returns tool_calls instead of an
    // answer on the round that requested it) would make the loop fetch one
    // response too many: the `for` condition fails right after this
    // iteration, so that response's body would never be pumped OR closed.
    // Flush any buffered text first so a model that narrated instead of
    // answering still shows *something* rather than a blank reply.
    if (round === MAX_TOOL_ROUNDS - 1) {
      if (roundText) opts.onContentChunk(roundText);
      return;
    }

    // Tool-call round: announce each call, echo the assistant's tool_calls
    // back verbatim (the exact shape providers require), then one "tool"
    // result message per call, and ask again with those results in context.
    for (const call of toolCalls) {
      opts.onStatus?.({
        kind: "tool",
        label: opts.describeTool?.(call.name, call.arguments) ?? "Looking something up",
      });
    }
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: toolCalls.map(toolCallWireFrom),
    });
    for (const call of toolCalls) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: opts.executeTool(call.name, call.arguments),
      });
    }
    opts.onStatus?.({ kind: "thinking", label: "Putting that together" });

    const isLastRound = round === MAX_TOOL_ROUNDS - 2;
    const next = await callUpstream(opts.fetchImpl, opts.url, opts.apiKey, {
      model: opts.model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      // tool_choice "none" on the final allowed round -- forces a real
      // answer instead of possibly requesting yet another tool call and
      // running out the round budget with nothing to show for it.
      ...(usedTools ? { tools: opts.tools, tool_choice: isLastRound ? "none" : "auto" } : {}),
    });

    if (!next.ok) return; // best-effort -- see the doc comment above
    response = next.response;
    usedTools = next.usedTools;
  }
}

export function pickByIndex<T>(arr: T[], index: number): T | undefined {
  if (!Number.isFinite(index)) return undefined;
  const i = index < 0 ? arr.length + index : index;
  return arr[i];
}
