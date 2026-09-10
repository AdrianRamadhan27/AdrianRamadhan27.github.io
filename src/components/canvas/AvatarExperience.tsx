import { useEffect, useRef, useState } from "react";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import AvatarCanvas, { type AvatarController } from "./Avatar";
import FlipAvatar from "./FlipAvatar";
import SpeechBubble from "../chat/SpeechBubble";
import ChatInputBar from "../chat/ChatInputBar";
import { ChatBubbleIcon } from "../chat/dockIcons";
import { useChatSession } from "../../hooks/useChatSession";
import { useContent } from "../../hooks/useContent";
import { useIsMobile } from "../../hooks/useIsMobile";
import { isBrowserTTSAvailable, speakWithBrowserTTS, streamSpeech } from "../../lib/voiceClient";
import { AudioStreamPlayer } from "../../lib/audioStreamPlayer";
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
//
// No microphone: voice here is TTS-only (the avatar speaks its replies).
// Typed input is the only way to ask it something.
//
// `docked`: true once Hero.tsx's IntersectionObserver reports the hero
// section has been scrolled fully out of view -- the whole thing then
// switches to a small fixed bottom-right "assistant" widget instead of its
// normal in-hero layout, so the avatar/chat stays reachable while browsing
// the rest of the page. The chat session itself (useChatSession below)
// doesn't care either way -- only the surrounding layout branches on it --
// so conversation state survives the transition even though the 3D canvas
// itself remounts crossing that boundary (different wrapper sizing between
// the docked/undocked layouts means React can't reconcile it as the same
// node; the GLB is drei-cached so this is a quick re-parse, not a refetch,
// and only the avatar's pose/animation state, not the conversation, resets).
const AvatarExperience = ({ docked = false }: { docked?: boolean }) => {
  const { chatPublic, profile, loading } = useContent();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT_PX);
  const avatarRef = useRef<AvatarController>(null);
  const playerRef = useRef<AudioStreamPlayer | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const audioUnlockedRef = useRef(false);
  const greetingSpokenRef = useRef(false);
  // Browser-TTS-fallback-only mouth level (see speak()'s catch branch) --
  // that path has no real audio in playerRef to read an amplitude off of
  // (browser SpeechSynthesis never reaches the Web Audio graph at all), so
  // it instead pokes a value in here on each word-boundary event, which
  // the rAF loop below reads AND decays every frame. usingFallbackRef
  // tells that loop which source to trust: without it, the loop's own
  // unconditional playerRef.current.read() call -- reading real silence,
  // since nothing is actually playing through that player during fallback
  // -- would overwrite this value right back to 0 almost every other
  // frame, which is exactly why the mouth previously stayed shut through
  // the fallback path even though the browser was audibly speaking.
  const fallbackMouthRef = useRef(0);
  const usingFallbackRef = useRef(false);
  // Docked-widget-only: collapses the whole thing down to a small circular
  // reopen button. Meaningless (unread) outside the `docked` branch below.
  const [minimized, setMinimized] = useState(false);

  // Client-side voice (TTS) switch, on top of the chatPublic.voiceEnabled
  // CMS master switch. Starts OFF so the page never makes noise on load,
  // then flips ON by itself the first time the visitor interacts with the
  // chat (unlockAudio below) -- unless they've already toggled it by hand,
  // in which case their choice sticks (voiceChoiceMadeRef). Read through a
  // ref in speak() since that's called from stale callbacks.
  const [voiceOn, setVoiceOn] = useState(false);
  const voiceOnRef = useRef(false);
  const voiceChoiceMadeRef = useRef(false);
  const setVoice = (on: boolean) => {
    voiceOnRef.current = on;
    setVoiceOn(on);
  };

  if (!playerRef.current) playerRef.current = new AudioStreamPlayer();

  // Drives mouthOpen every animation frame from whatever's currently
  // streaming through the PCM player. Runs continuously (cheap when
  // nothing is playing -- read() returns 0) rather than only while
  // speaking, so it doesn't need its own start/stop lifecycle.
  useEffect(() => {
    const tick = () => {
      if (usingFallbackRef.current) {
        avatarRef.current?.setMouthOpen(fallbackMouthRef.current);
        // Decays each frame so a word-boundary poke reads as a brief
        // flap-then-settle instead of a held-open mouth -- ~70ms
        // half-life at 60fps, independent of Avatar.tsx's own lerp
        // smoothing on top of whatever value this hands it.
        fallbackMouthRef.current *= 0.85;
      } else {
        avatarRef.current?.setMouthOpen(playerRef.current?.read() ?? 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Readies the AudioContext + AudioWorklet under a genuine, synchronous
  // user gesture -- by the time speak() below actually starts pushing
  // audio, several seconds of network + typewriter-reveal time have
  // usually passed, well outside the gesture window browsers require for
  // autoplay. Wired to fire on the first pointer/keyboard interaction
  // anywhere in this component (typing, clicking Send) rather than
  // threading a callback through the input control individually.
  //
  // Also where the greeting gets spoken, for the same reason it's not
  // spoken on load: the browser blocks audio (and AudioContext.resume())
  // until a real user gesture, so however much visitors might want to
  // hear it immediately, it physically can't play before their first
  // interaction. Speaking it here means it plays as soon as that gesture
  // happens -- typically clicking/tapping into the input, which precedes
  // actually typing a question by at least a moment.
  //
  // revealGreeting() is called in the same breath rather than on mount
  // (see holdGreeting passed to useChatSession below) -- with voice
  // enabled, the greeting bubble stays empty until this exact moment, so
  // its typewriter reveal and its TTS start together instead of the text
  // finishing its whole animation in silence well before audio's even
  // allowed to play.
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    void playerRef.current?.ensureReady();
    // First interaction -> voice defaults ON (unless the visitor already
    // set it themselves via the toggle). speak()'s own guards still apply.
    if (!voiceChoiceMadeRef.current && chatPublic.voiceEnabled) {
      setVoice(true);
    }
    if (!greetingSpokenRef.current && chatPublic.greeting.trim()) {
      greetingSpokenRef.current = true;
      revealGreeting();
      void speak(chatPublic.greeting);
    }
  };

  // The mute/unmute button. Also counts as unlocking audio (real user
  // gesture), and stops any in-flight speech immediately when muting.
  const toggleVoice = () => {
    voiceChoiceMadeRef.current = true;
    const next = !voiceOnRef.current;
    setVoice(next);
    if (next) {
      unlockAudio();
    } else {
      playerRef.current?.stop();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      usingFallbackRef.current = false;
      fallbackMouthRef.current = 0;
      avatarRef.current?.setSpeaking(false);
      avatarRef.current?.setMouthOpen(0);
    }
  };

  const speak = async (text: string) => {
    if (!chatPublic.voiceEnabled || !voiceOnRef.current || !text.trim()) return;
    const player = playerRef.current;
    avatarRef.current?.setSpeaking(true);
    try {
      if (player) {
        player.stop();
        await player.ensureReady();
        await streamSpeech(text, (bytes) => player.pushBytes(bytes));
        // The network stream being fully read doesn't mean playback is
        // done -- audio is scheduled ahead into the future as chunks
        // arrive, and the very last fraction of a second is deliberately
        // held back by every scheduling pass except the final one (see
        // audioStreamPlayer.ts's class-level comment on why). finish()
        // triggers that final pass so the tail of the reply actually gets
        // scheduled and played, instead of always being cut a beat short.
        player.finish();
        return;
      }
      throw new Error("No audio player available.");
    } catch {
      // Fall back to browser TTS -- can't be lip-synced (its audio output
      // never reaches the Web Audio graph, verified while planning this),
      // so approximate the mouth flap from word-boundary events instead of
      // leaving it frozen while still audibly speaking. usingFallbackRef
      // tells the rAF loop above to read fallbackMouthRef instead of the
      // (silent, during this path) real audio player.
      if (isBrowserTTSAvailable()) {
        usingFallbackRef.current = true;
        try {
          await speakWithBrowserTTS(text, () => {
            fallbackMouthRef.current = 0.3 + Math.random() * 0.4;
          });
        } catch {
          /* both paths failed -- the reply is still visible in the bubble */
        } finally {
          usingFallbackRef.current = false;
          fallbackMouthRef.current = 0;
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

  const { messages, busy, error, status, send, revealGreeting } = useChatSession({
    greeting: chatPublic.greeting,
    onGesture: handleGesture,
    onReplyDone: (fullText) => {
      void speak(fullText);
    },
    // Only worth holding back when voice is actually enabled -- if it's
    // not, TTS never plays for anything (see speak()'s own early return),
    // so delaying the greeting would just be pointless friction with no
    // payoff.
    holdGreeting: chatPublic.voiceEnabled,
  });

  const handleSend = (text: string) => {
    unlockAudio();
    void send(text);
  };

  // In-hero speech bubble: dismissable so a long reply doesn't cover the
  // hero. Re-shown automatically whenever a new reply starts (busy rising
  // edge) -- asking a question means you want to see its answer.
  const [bubbleHidden, setBubbleHidden] = useState(false);
  const prevBusyRef = useRef(false);
  useEffect(() => {
    if (busy && !prevBusyRef.current) setBubbleHidden(false);
    prevBusyRef.current = busy;
  }, [busy]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  // !loading, not just !enabled: chatPublic starts as the disabled default
  // for the ~200ms before chat_settings_public resolves, so gating only on
  // `enabled` flashed this "not configured" notice on every load. Once
  // loading is done, a still-disabled chat shows it for real.
  if (!loading && !chatPublic.enabled) {
    const disabledNotice = (
      <div className="border-accent/30 bg-tertiary/90 rounded-2xl border px-4 py-3 text-center">
        <p className="text-secondary text-[13px]">The chatbot isn't configured yet.</p>
      </div>
    );
    if (isMobile) {
      return (
        <div className="mt-8 flex flex-col items-center gap-4 px-6">
          <div className="mx-auto aspect-[2/3] w-full max-w-[260px] rounded-2xl">
            <FlipAvatar
              avatarUrl={chatPublic.avatarUrl}
              photoUrl={profile.photoUrl}
              photoCutout={profile.photoCutout}
              className="h-full w-full"
            />
          </div>
          {disabledNotice}
        </div>
      );
    }
    return (
      <div className="relative h-full w-full">
        <FlipAvatar
          avatarUrl={chatPublic.avatarUrl}
          photoUrl={profile.photoUrl}
          photoCutout={profile.photoCutout}
          className="absolute right-[var(--hero-photo-right-gap,15%)] top-[var(--hero-photo-top,24%)] z-0 aspect-[2/3] h-[var(--hero-photo-height,54%)] w-auto"
        />
        <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
          {disabledNotice}
        </div>
      </div>
    );
  }

  // Mute/unmute -- only offered when the CMS has voice enabled at all
  // (nothing to toggle otherwise). In the hero it sits left of the text
  // input; in the docked widget it's up in the top-right control cluster
  // next to the hide button.
  const voiceToggle = chatPublic.voiceEnabled ? (
    <button
      type="button"
      onClick={toggleVoice}
      aria-label={voiceOn ? "Mute the assistant's voice" : "Unmute the assistant's voice"}
      aria-pressed={voiceOn}
      title={voiceOn ? "Voice on" : "Voice off"}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        voiceOn
          ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
          : "border-accent/20 bg-tertiary/70 text-secondary hover:text-white"
      }`}
    >
      {voiceOn ? <FaVolumeUp className="h-4 w-4" /> : <FaVolumeMute className="h-4 w-4" />}
    </button>
  ) : null;

  const chatInput = <ChatInputBar onSend={handleSend} disabled={busy} />;
  // Hero layouts: voice toggle + input on one row.
  const chatInputRow = (
    <div className="flex items-center gap-2">
      {voiceToggle}
      <div className="min-w-0 flex-1">{chatInput}</div>
    </div>
  );
  const bubble = (
    <SpeechBubble
      text={lastAssistant?.content ?? ""}
      busy={busy}
      error={error}
      status={status}
    />
  );
  // Stretches to match the input bar's own width below it (both layouts
  // below give this the same "w-full max-w-md" wrapper the input already
  // uses) instead of shrinking to its own text content and ending up
  // narrower and left-edge-misaligned with the input. The docked widget
  // keeps the narrow default `bubble` -- it sits snug next to the avatar
  // crop there, not stacked above a same-width input.
  const wideBubble = (
    <SpeechBubble
      text={lastAssistant?.content ?? ""}
      busy={busy}
      error={error}
      status={status}
      onClose={() => setBubbleHidden(true)}
      widthClassName="w-full"
    />
  );
  // Shown in place of the in-hero bubble once it's been dismissed, so the
  // last reply is still one tap away without covering anything.
  const showBubbleButton = (
    <button
      type="button"
      onClick={() => setBubbleHidden(false)}
      className="border-accent/25 bg-tertiary/55 text-secondary hover:text-accent pointer-events-auto rounded-full border px-3 py-1 text-[12px] backdrop-blur-md transition-colors"
    >
      Show reply
    </button>
  );
  const heroBubble =
    bubbleHidden && lastAssistant?.content ? showBubbleButton : wideBubble;

  if (docked) {
    if (minimized) {
      // Same pill treatment as the hero's dismissed-bubble "Show reply"
      // button (bg-tertiary + accent border + backdrop-blur), just with an
      // icon + label and a bit more presence since it's the only way back.
      return (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Open chat"
          className="border-accent/25 bg-tertiary/70 text-secondary hover:text-accent fixed bottom-8 right-4 z-40 flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] shadow-xl backdrop-blur-md transition-colors"
        >
          <ChatBubbleIcon className="h-4 w-4" />
          Chat
        </button>
      );
    }
    return (
      // bottom-8, not bottom-4: raised enough to clear the footer's own
      // bottom-right content once scrolled all the way down (this widget
      // is position:fixed, so it stays in the same viewport corner
      // regardless of how far the page itself has scrolled). max-h-[75vh]
      // is a hard ceiling on the whole widget; the actual growth problem
      // (a long reply making the widget itself very tall) is solved one
      // level down -- the bubble gets its own max-height + scroll below --
      // so the avatar crop and input stay fixed-size and always reachable
      // rather than being pushed off or scrolling away with a long reply.
      <div
        className="border-accent/30 bg-tertiary/40 animate-pop fixed bottom-8 right-4 z-40 flex max-h-[75vh] w-64 flex-col gap-2 rounded-2xl border p-3 pt-9 shadow-xl backdrop-blur-md sm:w-72"
        onPointerDownCapture={unlockAudio}
        onKeyDownCapture={unlockAudio}
      >
        {/* Top-right control cluster: mute/unmute + hide-the-whole-widget.
            The hide button uses the same circular translucent design as
            the hero's bubble close button (SpeechBubble). */}
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {voiceToggle}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Hide chat"
            className="border-accent/25 bg-tertiary/90 text-secondary hover:text-accent hover:bg-tertiary flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex w-full items-end justify-end gap-2">
          <div className="max-h-40 overflow-y-auto">{bubble}</div>
          {/* Half-body crop. drei's Bounds fits a perspective camera using
              a SINGLE scalar (the object's largest bounding-box axis --
              standing height, here) checked against both the vertical AND
              horizontal FOV, so a narrow/tall canvas backs the camera off
              far enough that the (narrow) horizontal FOV also clears that
              same height-sized "diameter" too -- the object ends up
              shrunk, not just cropped, on anything narrower than square
              (verified empirically: a naively taller-than-wide inner
              canvas rendered the figure as a tiny speck, not a filled
              crop). A SQUARE inner canvas avoids that penalty entirely
              (fills to its height, Bounds' width check is then a no-op)
              and is fixed-pixel rather than percentage-based so it doesn't
              inherit the portrait wrapper's own (non-square) aspect ratio.
              Centered horizontally and pinned to the wrapper's top edge,
              so the portrait overflow-hidden wrapper crops the square's
              excess width evenly off both sides and its excess height
              off only the bottom -- i.e. the legs, not the head. */}
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-24">
            <div className="absolute left-1/2 top-0 h-[220px] w-[220px] -translate-x-1/2 sm:h-[260px] sm:w-[260px]">
              <AvatarCanvas
                ref={avatarRef}
                avatarUrl={chatPublic.avatarUrl}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
        <div className="w-full shrink-0">{chatInput}</div>
      </div>
    );
  }

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
        <div className="animate-pop mx-auto aspect-[2/3] w-full max-w-[260px] rounded-2xl">
          <FlipAvatar
            ref={avatarRef}
            avatarUrl={chatPublic.avatarUrl}
            photoUrl={profile.photoUrl}
            photoCutout={profile.photoCutout}
            className="h-full w-full"
          />
        </div>
        <div className="max-h-[30vh] w-full max-w-md overflow-y-auto">{heroBubble}</div>
        <div className="w-full max-w-md">{chatInputRow}</div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onPointerDownCapture={unlockAudio}
      onKeyDownCapture={unlockAudio}
    >
      {/* Placed to sit alongside the hero text rather than filling the
          hero (the heading/subtext/stats live in a full-bleed z-10 overlay
          -- see Hero.tsx -- and a full-size auto-centred avatar sat
          directly under them). z-0 makes that stacking explicit.

          top / height / right come from CSS custom properties Hero.tsx
          measures and sets on the <section> every layout: --hero-photo-top
          is the top of the subtext line, --hero-photo-height reaches down
          to the bottom of the stats card, and --hero-photo-right-gap is
          the distance from the section's right edge to the end of the
          name, so the card's right edge lines up with it. The literal
          fallbacks (15% / 24% / 54%) only apply for the one frame before
          that effect first runs. Width is derived from height by
          aspect-[2/3] -- one upright portrait frame the photo and the
          standing avatar figure both sit in. */}
      <FlipAvatar
        ref={avatarRef}
        avatarUrl={chatPublic.avatarUrl}
        photoUrl={profile.photoUrl}
        photoCutout={profile.photoCutout}
        className="animate-pop absolute right-[var(--hero-photo-right-gap,15%)] top-[var(--hero-photo-top,24%)] z-0 aspect-[2/3] h-[var(--hero-photo-height,54%)] w-auto"
      />

      {/* Bubble sits directly above the input bar, both anchored to the
          bottom -- moved off the top of the hero (which used to compete
          visually with the "Hi, I'm ..." heading there) and next to the
          control the visitor is actually looking at while reading a reply.
          This whole strip is bottom-anchored and grows UPWARD as content
          grows, so a long reply with no height cap would eventually reach
          up into that heading again -- same class of bug the floating
          docked widget had (see AvatarExperience's docked branch above),
          just with the hero heading in place of the footer as what it'd
          block. max-h-[30vh]+overflow-y-auto on the bubble itself caps
          that growth and makes it scrollable instead, while leaving the
          avatar crop and input bar below it fixed-size and undisturbed. */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-3 px-4 sm:bottom-10 sm:px-12">
        <div className="max-h-[30vh] w-full max-w-md overflow-y-auto">{heroBubble}</div>
        <div className="w-full max-w-md">{chatInputRow}</div>
      </div>
    </div>
  );
};

export default AvatarExperience;
