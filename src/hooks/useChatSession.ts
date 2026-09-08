import { useCallback, useEffect, useRef, useState } from "react";

import { streamChat, type ChatMessage } from "../lib/chatClient";
import { createTypewriter, type Typewriter } from "../lib/typewriter";
import { createGestureStripper, type GestureName } from "../lib/gestureTags";

// Extracted from what was originally private state inside ScreenChat so the
// avatar hero's voice/gesture UI can drive the same chat brain (message
// history, streaming, typewriter reveal) without duplicating it. ScreenChat
// itself was refactored to consume this hook too -- see git history/PR for
// the before/after if the terminal chat ever regresses.
export type UseChatSessionOptions = {
  greeting: string;
  /** Called for each [gesture:...] tag the model emits -- only meaningful
   *  when the chat's system prompt actually instructs it to (avatar hero
   *  mode; see supabase/functions/chat/index.ts). Tags never reach `messages`. */
  onGesture?: (name: GestureName) => void;
  /** Called once a reply has finished revealing, with the full text --
   *  the avatar hero uses this to kick off TTS synthesis. Not called for
   *  the initial greeting (autoplay would be blocked without a user
   *  gesture, and speaking on load would be jarring anyway). */
  onReplyDone?: (fullText: string) => void;
};

export function useChatSession({ greeting, onGesture, onReplyDone }: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typerRef = useRef<Typewriter | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Callbacks are read through refs rather than captured directly, so
  // `send` (below) doesn't need onGesture/onReplyDone in its own dependency
  // array and callers can pass a fresh inline function each render without
  // tearing down an in-flight stream's stripper/typewriter.
  const onGestureRef = useRef(onGesture);
  const onReplyDoneRef = useRef(onReplyDone);
  useEffect(() => {
    onGestureRef.current = onGesture;
    onReplyDoneRef.current = onReplyDone;
  }, [onGesture, onReplyDone]);

  useEffect(() => {
    return () => {
      typerRef.current?.cancel();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!greeting) return;
    typerRef.current?.cancel();
    setMessages([{ role: "assistant", content: "" }]);
    const typer = createTypewriter((text) => {
      setMessages([{ role: "assistant", content: text }]);
    });
    typerRef.current = typer;
    typer.push(greeting);
    typer.finish();
  }, [greeting]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    typerRef.current?.cancel();
    setBusy(false);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const nextHistory: ChatMessage[] = [];
    setMessages((m) => {
      nextHistory.push(...m, { role: "user", content: trimmed });
      return nextHistory;
    });
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    typerRef.current?.cancel();
    const typer = createTypewriter((revealed) => {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: revealed };
        return copy;
      });
    });
    typerRef.current = typer;

    const stripper = createGestureStripper((name) => onGestureRef.current?.(name));
    let fullText = "";

    try {
      await streamChat(
        nextHistory,
        (chunk) => {
          const visible = stripper.push(chunk);
          if (visible) {
            fullText += visible;
            typer.push(visible);
          }
        },
        { signal: abortController.signal }
      );
      const rest = stripper.flush();
      if (rest) {
        fullText += rest;
        typer.push(rest);
      }
      // Network stream is done, but the typewriter may still be catching
      // up (it reveals slower than chunks can arrive) -- keep `busy` true
      // until the reveal itself finishes, not just the network.
      await new Promise<void>((resolve) => typer.finish(resolve));
      onReplyDoneRef.current?.(fullText);
    } catch (e) {
      typer.cancel();
      if (e instanceof DOMException && e.name === "AbortError") {
        // User-initiated cancel (voice barge-in) -- not an error worth
        // showing; just drop the empty assistant bubble.
        setMessages((m) => m.slice(0, -1));
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setMessages((m) => m.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { messages, busy, error, send, cancel };
}
