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

  // Mirrors `messages` synchronously. `send` needs the current history at
  // the instant it's called to build the request to the model -- reading
  // React state via a setState-updater side channel (an earlier version
  // did `setMessages((m) => { external = [...m, ...]; return external; })`)
  // turned out to be unreliable here: nothing guarantees the updater has
  // actually run by the time the very next line of code reads the
  // variable it assigned. That silently sent `messages: []` to the chat
  // edge function on every single message -- confirmed by intercepting the
  // real network request in a running instance of this app -- which is
  // exactly why replies looked like the model improvising a generic
  // self-introduction from the system prompt alone: it never received the
  // conversation, or even the current question. `messagesRef` is instead
  // updated manually, synchronously, at every single site that changes
  // `messages`, so `messagesRef.current` is always trustworthy.
  const messagesRef = useRef<ChatMessage[]>([]);
  const setMessagesAndRef = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

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
    setMessagesAndRef([{ role: "assistant", content: "" }]);
    const typer = createTypewriter((text) => {
      setMessagesAndRef([{ role: "assistant", content: text }]);
    });
    typerRef.current = typer;
    typer.push(greeting);
    typer.finish();
  }, [greeting, setMessagesAndRef]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    typerRef.current?.cancel();
    setBusy(false);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    // messagesRef.current is synchronously current -- see the comment on
    // its declaration above for why this replaced reading it back out of
    // a setState updater.
    const nextHistory: ChatMessage[] = [...messagesRef.current, { role: "user", content: trimmed }];
    setMessagesAndRef(nextHistory);
    setBusy(true);
    setError(null);
    setMessagesAndRef((m) => [...m, { role: "assistant", content: "" }]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    typerRef.current?.cancel();
    const typer = createTypewriter((revealed) => {
      setMessagesAndRef((m) => {
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
        setMessagesAndRef((m) => m.slice(0, -1));
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setMessagesAndRef((m) => m.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  }, [busy, setMessagesAndRef]);

  return { messages, busy, error, send, cancel };
}
