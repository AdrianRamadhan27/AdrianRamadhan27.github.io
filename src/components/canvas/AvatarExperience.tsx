import { useEffect, useRef } from "react";

import AvatarCanvas, { type AvatarController } from "./Avatar";
import SpeechBubble from "../chat/SpeechBubble";
import ChatInputBar from "../chat/ChatInputBar";
import { useChatSession } from "../../hooks/useChatSession";
import { useContent } from "../../hooks/useContent";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  isBrowserTTSAvailable,
  speakWithBrowserTTS,
  synthesizeSpeech,
} from "../../lib/voiceClient";
import { LipsyncDriver } from "../../lib/lipsync";
import type { GestureName } from "../../lib/gestureTags";

// Matches Computers.tsx's own breakpoint: below this, a percentage/`h-full`
// height has nothing definite to resolve against (the hero section is only
// `min-h-screen` there, not a fixed height), so both heroes switch to a
// fixed-height, normal-flow layout instead of an absolute-overlay one.
const MOBILE_BREAKPOINT_PX = 640;

// The avatar hero's counterpart to ComputersCanvas: composes the 3D scene
// (Avatar.tsx) with a normal-DOM chat UI (speech bubble + input bar). Unlike
// ComputersCanvas, the chat UI here is NOT inside drei's <Html> -- it sits
// beside the canvas in ordinary React DOM, which is exactly why this
// component (rather than something inside the Canvas) is the right place to
// read useContent() and own the chat/voice state machine.
const AvatarExperience = () => {
  const { chatPublic } = useContent();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT_PX);
  const avatarRef = useRef<AvatarController>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lipsyncRef = useRef<LipsyncDriver | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    if (audioRef.current) lipsyncRef.current = new LipsyncDriver(audioRef.current);
  }, []);

  // Drives mouthOpen every animation frame from whatever's currently
  // playing through the shared <audio> element. Runs continuously (cheap
  // when nothing is playing -- read() returns 0) rather than only while
  // speaking, so it doesn't need its own start/stop lifecycle.
  useEffect(() => {
    const tick = () => {
      avatarRef.current?.setMouthOpen(lipsyncRef.current?.read() ?? 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // "Unlocks" the shared <audio> element under a genuine, synchronous user
  // gesture -- by the time speak() below actually calls .play(), several
  // seconds of network + typewriter-reveal time have usually passed, well
  // outside the gesture window browsers require for autoplay. A media
  // element that has ONCE played (even silently) under a real gesture stays
  // eligible for programmatic play() afterward, which is what this trades
  // on. Wired to fire on the first pointer/keyboard interaction anywhere in
  // this component (typing, clicking Send, clicking the mic) rather than
  // threading a callback through every input control individually.
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    const el = audioRef.current;
    if (!el) return;
    lipsyncRef.current?.ensureContext();
    el.muted = true;
    el.play()
      .then(() => el.pause())
      .catch(() => {
        /* some browsers reject even a muted priming play(); harmless either way */
      })
      .finally(() => {
        el.muted = false;
      });
    audioUnlockedRef.current = true;
  };

  const speak = async (text: string) => {
    if (!chatPublic.voiceEnabled || !text.trim()) return;
    const el = audioRef.current;
    avatarRef.current?.setSpeaking(true);
    try {
      if (el) {
        el.pause();
        el.currentTime = 0;
        const blob = await synthesizeSpeech(text);
        const url = URL.createObjectURL(blob);
        el.src = url;
        await el.play();
        await new Promise<void>((resolve) => {
          el.onended = () => resolve();
        });
        URL.revokeObjectURL(url);
        return;
      }
      throw new Error("No audio element available.");
    } catch {
      // Fall back to browser TTS -- can't be lip-synced (its audio output
      // never reaches the Web Audio graph, verified while planning this),
      // so approximate the mouth flap from word-boundary events instead of
      // leaving it frozen while still audibly speaking.
      if (isBrowserTTSAvailable()) {
        try {
          await speakWithBrowserTTS(text, () => {
            avatarRef.current?.setMouthOpen(0.3 + Math.random() * 0.4);
          });
        } catch {
          /* both paths failed -- the reply is still visible in the bubble */
        }
      }
    } finally {
      avatarRef.current?.setSpeaking(false);
      avatarRef.current?.setMouthOpen(0);
    }
  };

  const handleGesture = (name: GestureName) => {
    avatarRef.current?.triggerGesture(name);
  };

  const { messages, busy, error, send } = useChatSession({
    greeting: chatPublic.greeting,
    onGesture: handleGesture,
    onReplyDone: (fullText) => {
      void speak(fullText);
    },
  });

  const handleSend = (text: string) => {
    unlockAudio();
    void send(text);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  if (!chatPublic.enabled) {
    const disabledNotice = (
      <div className="border-accent/30 bg-tertiary/90 rounded-2xl border px-4 py-3 text-center">
        <p className="text-secondary text-[13px]">The chatbot isn't configured yet.</p>
      </div>
    );
    if (isMobile) {
      return (
        <div className="mt-8 flex flex-col items-center gap-4 px-6">
          <div className="h-[42vh] max-h-[360px] w-full max-w-md overflow-hidden rounded-2xl">
            <AvatarCanvas avatarUrl={chatPublic.avatarUrl} className="h-full w-full" />
          </div>
          {disabledNotice}
        </div>
      );
    }
    return (
      <div className="relative h-full w-full">
        <AvatarCanvas avatarUrl={chatPublic.avatarUrl} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
          {disabledNotice}
        </div>
      </div>
    );
  }

  const chatInput = (
    <ChatInputBar onSend={handleSend} disabled={busy} voiceEnabled={chatPublic.voiceEnabled} />
  );
  // Synthesized speech has no track to caption; the reply text itself is
  // the visible transcript via SpeechBubble.
  const audioEl = <audio ref={audioRef} className="hidden" />;

  if (isMobile) {
    // Normal-flow stack, not absolute overlays -- min-h-screen (the hero
    // section's mobile sizing) has no definite height for a percentage/
    // h-full child to resolve against, the same reason Computers.tsx
    // renders a fixed-height fallback instead of a Canvas-filled section
    // below this breakpoint.
    return (
      <div
        className="mt-8 flex flex-col items-center gap-4 px-6"
        onPointerDownCapture={unlockAudio}
        onKeyDownCapture={unlockAudio}
      >
        <div className="h-[42vh] max-h-[360px] w-full max-w-md overflow-hidden rounded-2xl">
          <AvatarCanvas ref={avatarRef} avatarUrl={chatPublic.avatarUrl} className="h-full w-full" />
        </div>
        {audioEl}
        <SpeechBubble text={lastAssistant?.content ?? ""} busy={busy} error={error} />
        <div className="w-full max-w-md">{chatInput}</div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onPointerDownCapture={unlockAudio}
      onKeyDownCapture={unlockAudio}
    >
      {/* Anchored to the bottom-right corner and sized well under the full
          hero, rather than filling it -- the hero heading ("Hi, I'm ...")
          lives in a full-bleed overlay too (see Hero.tsx), left-aligned in
          the top-left; a full-size, auto-centered avatar sat directly
          behind/under it. z-0 makes stacking explicit rather than relying
          on default paint order, matching the z-10 convention Hero.tsx
          already uses for its own text-over-canvas overlay. */}
      {/* bottom-[18%], not bottom-0: leaves the canvas's own bounding box
          (which extends well below the rendered figure -- Bounds frames
          with margin, so there's transparent canvas space beneath the
          feet) clear of the input bar's strip entirely, rather than
          trusting z-index alone against a transparent-but-still-hit-
          testable canvas element sitting under it. */}
      <AvatarCanvas
        ref={avatarRef}
        avatarUrl={chatPublic.avatarUrl}
        className="absolute bottom-[18%] right-0 z-0 h-[55%] w-[70%] sm:h-[62%] sm:w-[42%] lg:w-[36%]"
      />
      {audioEl}

      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4 sm:top-10">
        <div className="pointer-events-auto">
          <SpeechBubble text={lastAssistant?.content ?? ""} busy={busy} error={error} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-4 z-10 px-4 sm:bottom-10 sm:px-12">
        <div className="mx-auto max-w-md">{chatInput}</div>
      </div>
    </div>
  );
};

export default AvatarExperience;
