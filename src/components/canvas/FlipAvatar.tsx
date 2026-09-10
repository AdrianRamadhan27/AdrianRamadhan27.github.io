import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Tilt from "react-parallax-tilt";

import AvatarCanvas, { type AvatarController } from "./Avatar";

// First flip is quick -- photo shows just long enough to register, then
// turns to the avatar. Every flip after that is on the slow cadence, so
// the two just trade places occasionally rather than constantly spinning.
const INITIAL_FLIP_DELAY_MS = 1500;
const PERIODIC_FLIP_MS = 45000;
// After the ~0.85s card flip + the figure's synced turn have both landed,
// so the wave reads as a forward-facing hello, not a sideways one mid-turn.
const WAVE_AFTER_FLIP_MS = 1000;

type Props = {
  avatarUrl?: string;
  photoUrl?: string;
  // photoUrl is a transparent cutout PNG -- render it bare (no card frame),
  // with its bottom edge masked to a fade and a green glow on the
  // silhouette, instead of the framed-photo treatment.
  photoCutout?: boolean;
  className?: string;
};

// The hero's photo <-> 3D avatar. A CSS 3D card: the photo on the front
// face, the avatar's canvas on the back. The avatar model additionally
// turns on its own Y axis IN THE SAME rotational direction as, and over
// the same time as, the card flip (facing prop below + the matched damp
// rate in Avatar.tsx) -- so the whole thing reads as one continuous
// turntable motion rather than the card and the figure spinning against
// each other. Flipping to the photo is the exact reverse of that motion.
// Clicking either side flips it; it also auto-flips on the timers above.
//
// Forwards a ref straight through to the inner AvatarCanvas so
// AvatarExperience can keep driving the avatar's mouth/speaking/gestures
// every frame regardless of which side is currently showing.
const FlipAvatar = forwardRef<AvatarController, Props>(
  ({ avatarUrl, photoUrl, photoCutout = false, className }, ref) => {
    const innerRef = useRef<AvatarController>(null);
    const [showAvatar, setShowAvatar] = useState(false);
    // Drives the cutout photo's silhouette-glow grow/brighten. On the
    // non-3D outer div (not a CSS :hover on the glow itself) because the
    // glow sits inside the preserve-3d flip card, where :hover
    // hit-testing through the 3D context is unreliable -- same reason
    // AvatarCanvas tracks its own hover in state.
    const [photoHovered, setPhotoHovered] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        triggerGesture: (n) => innerRef.current?.triggerGesture(n),
        setMouthOpen: (v) => innerRef.current?.setMouthOpen(v),
        setSpeaking: (v) => innerRef.current?.setSpeaking(v),
      }),
      []
    );

    useEffect(() => {
      const id = setTimeout(() => setShowAvatar(true), INITIAL_FLIP_DELAY_MS);
      return () => clearTimeout(id);
    }, []);

    // Restarts on every flip (deps: showAvatar), so a manual click doesn't
    // get auto-flipped back a moment later -- the periodic clock always
    // measures from the last flip, whoever caused it.
    useEffect(() => {
      const id = setInterval(
        () => setShowAvatar((s) => !s),
        PERIODIC_FLIP_MS
      );
      return () => clearInterval(id);
    }, [showAvatar]);

    // Wave after any flip that brings the avatar into view.
    useEffect(() => {
      if (!showAvatar) return;
      const id = setTimeout(
        () => innerRef.current?.triggerGesture("wave"),
        WAVE_AFTER_FLIP_MS
      );
      return () => clearTimeout(id);
    }, [showAvatar]);

    // No photo set in the CMS -- nothing to flip to, so this degrades to
    // exactly the plain avatar it replaced.
    if (!photoUrl) {
      return (
        <AvatarCanvas
          ref={innerRef}
          avatarUrl={avatarUrl}
          className={className}
          boundsMargin={0.75}
        />
      );
    }

    return (
      // className (positioning + sizing + the animate-pop entrance) stays
      // on this outer div, away from the perspective/preserve-3d chain --
      // animate-pop's own `transform: scale(...)` on the same element as
      // `perspective` can flatten the 3D flip in some browsers.
      <div
        className={className}
        onPointerEnter={() => setPhotoHovered(true)}
        onPointerLeave={() => setPhotoHovered(false)}
      >
        <div className="hero-flip h-full w-full">
          <div
            className={`hero-flip-inner ${showAvatar ? "is-flipped" : ""}`}
          >
            <button
              type="button"
              aria-label="Show the interactive avatar"
              onClick={() => setShowAvatar(true)}
              className={
                photoCutout
                  ? "hero-flip-face flex cursor-pointer items-end justify-center"
                  : "hero-flip-face green-pink-gradient shadow-card block cursor-pointer rounded-[24px] p-[3px]"
              }
            >
              {photoCutout ? (
                // Bare cutout: no frame. The glow sits on the wrapper, not
                // the <img>, so drop-shadow reads the image's alpha AFTER
                // its own bottom-fade mask -- the green outline follows the
                // faded hem instead of glowing along a hard box edge there.
                // Same silhouette glow (and hover grow/brighten) as the 3D
                // avatar on the back face. object-bottom + items-end stand
                // the figure on the box's floor, roughly where the avatar's
                // feet land.
                <div
                  className={`green-silhouette-glow h-full w-full ${
                    photoHovered ? "green-silhouette-glow--hover" : ""
                  }`}
                >
                  <img
                    src={photoUrl}
                    alt=""
                    className="hero-cutout-img h-full w-full object-contain object-bottom"
                  />
                </div>
              ) : (
                // Same parallax-tilt + green glare the portrait had on the
                // About page. Wraps only the image, not the flip face
                // itself -- the face carries the card's own rotateY flip
                // state, and a second 3D transform on the same element
                // would fight it. The face is only ever hovered while the
                // card is flat (photo showing), so the two never overlap.
                <Tilt
                  glareEnable
                  tiltEnable
                  tiltMaxAngleX={8}
                  tiltMaxAngleY={8}
                  glareColor="#00df9a"
                  glareMaxOpacity={0.35}
                  className="h-full w-full overflow-hidden rounded-[22px]"
                >
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full rounded-[22px] object-cover object-top"
                    style={{
                      filter: "grayscale(0.3) contrast(1.05) saturate(1.15)",
                    }}
                  />
                </Tilt>
              )}
            </button>

            <div className="hero-flip-face hero-flip-face--back">
              <AvatarCanvas
                ref={innerRef}
                avatarUrl={avatarUrl}
                className="h-full w-full"
                facing={showAvatar ? "front" : "back"}
                onFigureClick={() => setShowAvatar(false)}
                boundsMargin={0.75}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FlipAvatar.displayName = "FlipAvatar";

export default FlipAvatar;
