import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import { invalidateOnContextRestore } from "../../utils/webgl";

// Bundled default avatar -- see public/avatar/license.txt for provenance,
// the mouth-bar rationale below, and the bone-name convention this rig
// uses (different from the ORIGINAL bundled avatar's Mixamo/RPM names --
// only relevant to the procedural fallback path further down). The CMS
// can point avatar_path at a different upload at any time; this only
// renders when that's unset.
const DEFAULT_AVATAR_URL = "./avatar/model.glb";

export type GestureName = "wave" | "jumping_jacks" | "dance";
// Procedural-fallback-only durations (see applyGesturePose) -- a clip-
// based avatar (this one included) uses the clip's own real length
// instead, via the mixer's 'finished' event.
const GESTURE_DURATION_S: Record<GestureName, number> = {
  wave: 2.2,
  jumping_jacks: 3.4,
  dance: 4.2,
};

// Bones this component looks for by exact name. "Head" is used by both
// modes (cursor look-at, mouth bar anchor, talking nod); the rest are only
// consulted by the procedural fallback for an avatar shipping no baked
// animation clips (the ORIGINAL bundled avatar was like this; this one
// isn't, but a future re-upload might be).
const BONE_NAMES = [
  "Hips",
  "Spine",
  "Spine1",
  "Spine2",
  "Neck",
  "Head",
  "LeftShoulder",
  "LeftArm",
  "LeftForeArm",
  "RightShoulder",
  "RightArm",
  "RightForeArm",
  "LeftUpLeg",
  "LeftLeg",
  "RightUpLeg",
  "RightLeg",
] as const;
type BoneName = (typeof BONE_NAMES)[number];

// A wide-brimmed hat some earlier stock avatar shipped hid its whole face;
// hidden unconditionally, harmless no-op if a mesh by this name doesn't exist.
const HIDDEN_MESH_NAMES = ["Wolf3D_Headwear"];

// --- Mouth bar -------------------------------------------------------
// This avatar's face has no mouth geometry, texture, or morph target at
// all (verified directly -- a flat, single-material, low-poly surface;
// see license.txt for the full story of why a real morph-target "open
// mouth" was attempted and abandoned: the mesh has no seam/cavity to
// reveal, so deforming it just stretches the same continuous surface,
// imperceptibly at first and as a broken-looking neck/chin stretch once
// exaggerated enough to see at all). A separate flat bar -- the same
// stylization already used for this character's eyebrows -- sidesteps the
// problem entirely: a thin line when closed, growing taller as the model
// speaks. The X/Y here were found empirically (rendering the real mesh
// with a marker parented to the Head bone, iterating by eye); the Z
// (depth) was then solved properly rather than guessed -- raycasting from
// a front-on camera through that X/Y position against the real face mesh
// to find its actual front-surface depth, then nudging just inside it.
// That matters because this material is depth-tested (see below): with an
// arbitrary/untested Z, rendering on top of everything regardless of
// depth had made it look right head-on but float disconnected from the
// face from any other angle -- it wasn't sitting IN the surface, so nose
// and other actual occluders never covered it and it never got occluded
// by the head at extreme angles either.
const MOUTH_BAR_LOCAL_POSITION = new THREE.Vector3(-0.0000389, 0.0003841, 0.0013672);
const MOUTH_BAR_WIDTH = 0.00045;
const MOUTH_BAR_HEIGHT_CLOSED = 0.00004;
const MOUTH_BAR_HEIGHT_OPEN = 0.00028;

function deg(d: number) {
  return THREE.MathUtils.degToRad(d);
}

// Case-insensitive substring match against the GLTF's actual clip names --
// a third-party asset's animation names can't be guaranteed to line up
// exactly with this project's gesture vocabulary. Tries each keyword in
// order and returns the first clip name that matches any of them.
function pickClip(names: string[], keywords: string[]): string | undefined {
  const lower = names.map((n) => n.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((n) => n.includes(kw));
    if (idx >= 0) return names[idx];
  }
  return undefined;
}

type ClipMap = {
  idle?: string;
  wave?: string;
  jumping_jacks?: string;
  dance?: string;
  // Idle-fidget pool -- see the ambient-action state machine in useFrame
  // below. Not every keyword necessarily resolves against a given avatar's
  // clip list, so this can end up shorter than AMBIENT_ACTION_KEYWORDS or
  // even empty (the fallback bundled avatar has all five).
  ambientActions: string[];
};

// Idle-fidget clips this bundled avatar's own pack ships (see
// license.txt's full clip list) -- played randomly, one at a time, while
// nothing else (a real gesture, or the visitor) is asking for anything
// specific, so standing around waiting for a message doesn't look inert.
// Deliberately excludes anything already spoken for elsewhere (Wave is the
// explicit greeting/click gesture; Roll doubles as the "dance" gesture's
// own fallback -- reusing it here too is fine, they're driven by
// different triggers and never fight over which one to play).
const AMBIENT_ACTION_KEYWORDS = ["punch_left", "punch_right", "kick_left", "kick_right", "roll"];

function resolveClipMap(names: string[]): ClipMap {
  return {
    idle: pickClip(names, ["idle"]) ?? names[0],
    wave: pickClip(names, ["wave"]),
    // This particular pack has no literal "jumping jacks" clip -- "jump"
    // is the closest fallback; if neither exists the gesture just plays
    // idle instead of crashing (see the useFrame gesture logic below).
    jumping_jacks: pickClip(names, ["jump", "jack"]),
    dance: pickClip(names, ["dance", "roll", "interact"]),
    ambientActions: AMBIENT_ACTION_KEYWORDS.map((kw) => pickClip(names, [kw])).filter(
      (n): n is string => !!n
    ),
  };
}

// Idle fidgets fire this often apart, +/- a random spread -- "every few
// seconds" per the brief, without being so regular it reads as a metronome.
const AMBIENT_ACTION_MIN_INTERVAL_S = 4;
const AMBIENT_ACTION_MAX_INTERVAL_S = 9;

function nextAmbientDelay(): number {
  return (
    AMBIENT_ACTION_MIN_INTERVAL_S +
    Math.random() * (AMBIENT_ACTION_MAX_INTERVAL_S - AMBIENT_ACTION_MIN_INTERVAL_S)
  );
}

// Adds a small talking sway (subtle, so it doesn't fight whatever gesture
// or idle pose is already applied) and, independently, always-on idle
// breathing -- both run continuously regardless of the active gesture so
// the avatar never looks perfectly frozen. Procedural-fallback only; a
// clip-based avatar's own Idle/Talking-adjacent clips already breathe.
function applyAmbientMotion(
  bones: Partial<Record<BoneName, THREE.Bone>>,
  rest: Partial<Record<BoneName, THREE.Euler>>,
  t: number,
  speaking: boolean
) {
  const spine = bones.Spine;
  const spineRest = rest.Spine;
  if (spine && spineRest) {
    spine.rotation.x = spineRest.x + Math.sin(t * 1.1) * deg(1.4);
    spine.rotation.z = spineRest.z + Math.sin(t * 0.7) * deg(0.8);
  }
  const head = bones.Head;
  const headRest = rest.Head;
  if (head && headRest) {
    const talkNod = speaking ? Math.sin(t * 7) * deg(2.5) : 0;
    head.rotation.x = headRest.x + Math.sin(t * 0.9) * deg(1.2) + talkNod;
    head.rotation.y = headRest.y + Math.sin(t * 0.5) * deg(2);
  }
}

function applyGesturePose(
  bones: Partial<Record<BoneName, THREE.Bone>>,
  rest: Partial<Record<BoneName, THREE.Euler>>,
  gesture: GestureName | null,
  progress: number, // 0..1 through the gesture's duration; ignored when idle
  t: number
) {
  const setLocal = (name: BoneName, x?: number, y?: number, z?: number) => {
    const bone = bones[name];
    const r = rest[name];
    if (!bone || !r) return;
    if (x !== undefined) bone.rotation.x = r.x + x;
    if (y !== undefined) bone.rotation.y = r.y + y;
    if (z !== undefined) bone.rotation.z = r.z + z;
  };

  // A Mixamo/RPM-style rig's bind pose is a T-pose (arms out horizontal).
  // Counter-intuitively the fix lives on the SHOULDER bone, not the Arm
  // bone -- confirmed empirically against that rig: zeroing the Arm
  // bone's own rest rotation left the T-pose completely unchanged. The
  // Shoulder bone's rest X (~89 degrees) is what actually swings the arm
  // out sideways; rotating it further past rest (not back toward 0, which
  // swings the arm UP overhead instead) brings it down to a natural hang.
  setLocal("LeftShoulder", deg(80), 0, 0);
  setLocal("RightShoulder", deg(80), 0, 0);

  if (gesture === "wave") {
    const raiseEnvelope =
      progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
    setLocal("RightArm", 0, 0, -deg(100) * raiseEnvelope);
    setLocal("RightForeArm", 0, deg(20), -deg(30 + Math.sin(t * 14) * 20) * raiseEnvelope);
    return;
  }

  if (gesture === "jumping_jacks") {
    const cycle = Math.sin(t * 9);
    const spread = (cycle + 1) / 2;
    setLocal("LeftArm", 0, 0, deg(20 + spread * 70));
    setLocal("RightArm", 0, 0, -deg(20 + spread * 70));
    setLocal("LeftUpLeg", 0, 0, -deg(spread * 22));
    setLocal("RightUpLeg", 0, 0, deg(spread * 22));
    const hips = bones.Hips;
    if (hips) hips.position.y += Math.max(0, cycle) * 0.06;
    return;
  }

  if (gesture === "dance") {
    const swing = Math.sin(t * 5);
    setLocal("Hips", 0, swing * deg(10), 0);
    setLocal("Spine", 0, -swing * deg(6), 0);
    setLocal("LeftArm", 0, 0, deg(15) + swing * deg(25));
    setLocal("RightArm", 0, 0, -deg(15) - swing * deg(25));
    return;
  }
}

function findMouthInfluenceIndex(mesh: THREE.SkinnedMesh, name: string) {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return -1;
  if (dict[name] !== undefined) return dict[name];
  const key = Object.keys(dict).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? dict[key] : -1;
}

// Mutated imperatively (never via React state) so a 60fps lipsync/pointer
// update doesn't cause a React re-render loop -- useFrame reads this
// directly every frame instead.
type AvatarState = {
  gesture: GestureName | null;
  gestureStartedAt: number;
  mouthOpen: number;
  speaking: boolean;
  pointer: { x: number; y: number };
};

export type AvatarController = {
  triggerGesture: (name: GestureName) => void;
  /** 0..1 instantaneous mouth-open amount, fed every animation frame from
   *  a Web Audio analyser tracking the currently-playing TTS audio. */
  setMouthOpen: (v: number) => void;
  setSpeaking: (v: boolean) => void;
};

function AvatarModel({
  url,
  state,
  facing = "front",
  onFigureClick,
}: {
  url: string;
  state: AvatarState;
  // "back" turns the whole figure ~180deg away from the camera; the
  // useFrame loop below damps toward it. Used by FlipAvatar so that, as
  // the photo<->avatar card flips, the avatar visibly turns around from
  // back-to-back with the photo to facing the viewer, rather than just
  // fading in already forward-facing.
  facing?: "front" | "back";
  // When provided, a click on the figure calls this instead of the
  // default click-to-wave -- FlipAvatar uses it to flip back to the photo.
  onFigureClick?: () => void;
}) {
  const { scene, animations } = useGLTF(url);
  const hasClips = animations.length > 0;

  const groupRef = useRef<THREE.Group>(null);
  const { actions, names, mixer } = useAnimations(animations, groupRef);

  const bonesRef = useRef<Partial<Record<BoneName, THREE.Bone>>>({});
  const restRef = useRef<Partial<Record<BoneName, THREE.Euler>>>({});
  const mouthMeshesRef = useRef<{ mesh: THREE.SkinnedMesh; open: number; smile: number }[]>([]);
  const mouthBarRef = useRef<THREE.Mesh | null>(null);
  const hipsBaseY = useRef(0);
  const clipMapRef = useRef<ClipMap>({ ambientActions: [] });
  const activeClipRef = useRef<string | null>(null);
  const lastGestureStartRef = useRef(0);
  // Ambient idle-fidget state -- see the AMBIENT_ACTION_KEYWORDS comment.
  // ambientPlayingRef distinguishes "an ambient action is mid-playback"
  // (in which case the useFrame loop below must NOT crossfade back to
  // idle just because state.gesture is null -- that's also true while an
  // ambient action is playing) from "nothing's playing, waiting for the
  // next scheduled one".
  const ambientPlayingRef = useRef(false);
  const ambientNextAtRef = useRef(Infinity);

  useEffect(() => {
    const bones: Partial<Record<BoneName, THREE.Bone>> = {};
    const rest: Partial<Record<BoneName, THREE.Euler>> = {};
    const mouthMeshes: { mesh: THREE.SkinnedMesh; open: number; smile: number }[] = [];

    scene.traverse((child) => {
      const bone = child as THREE.Bone;
      if (bone.isBone && (BONE_NAMES as readonly string[]).includes(bone.name)) {
        bones[bone.name as BoneName] = bone;
        rest[bone.name as BoneName] = bone.rotation.clone();
      }
      const mesh = child as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh && mesh.morphTargetDictionary) {
        const open = findMouthInfluenceIndex(mesh, "mouthOpen");
        const smile = findMouthInfluenceIndex(mesh, "mouthSmile");
        if (open >= 0 || smile >= 0) mouthMeshes.push({ mesh, open, smile });
      }
      if (HIDDEN_MESH_NAMES.includes(child.name)) child.visible = false;
    });

    bonesRef.current = bones;
    restRef.current = rest;
    mouthMeshesRef.current = mouthMeshes;
    hipsBaseY.current = bones.Hips?.position.y ?? 0;

    // Mouth bar: a plain flat plane parented directly to the Head bone
    // (not the face mesh -- a SkinnedMesh's own node stays at its bind
    // transform even while its vertices deform via skinning, so a child
    // added to it would NOT follow the head through an Idle/Wave/etc
    // animation; a bone is a normal Object3D whose children move and
    // rotate with it automatically). Created once here rather than in
    // JSX since which bone to parent to is only known after this scan.
    if (bones.Head && !mouthBarRef.current) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(MOUTH_BAR_WIDTH, 1),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          side: THREE.DoubleSide,
          // Depth-tested (not on top of everything unconditionally) so it
          // actually reads as sitting on the face's surface -- occluded by
          // the nose/jaw at a profile angle, occluding correctly itself --
          // rather than floating in front of the model from every angle
          // regardless of what's actually in front of it. A small negative
          // polygon offset nudges its rendered depth a hair closer to the
          // camera than its true position, same trick used for any
          // decal-on-a-surface, to avoid z-fighting against the face mesh
          // it's sitting just barely in front of.
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        })
      );
      bar.scale.y = MOUTH_BAR_HEIGHT_CLOSED;
      bar.position.copy(MOUTH_BAR_LOCAL_POSITION);
      bones.Head.add(bar);
      mouthBarRef.current = bar;
    }
  }, [scene]);

  useEffect(() => {
    if (!hasClips) return;
    clipMapRef.current = resolveClipMap(names);
    // First idle fidget after an initial delay, same random range as every
    // subsequent one -- not immediately on load, before the visitor's even
    // had a moment to see the avatar standing normally.
    ambientNextAtRef.current = performance.now() / 1000 + nextAmbientDelay();
  }, [hasClips, names]);

  // Crossfades to a named clip; `once` plays it exactly once and clamps on
  // the last frame (gestures), otherwise loops it forever (idle).
  const crossfadeTo = (name: string | undefined, once: boolean) => {
    if (!name || name === activeClipRef.current) return;
    const prevName = activeClipRef.current;
    if (prevName) actions[prevName]?.fadeOut(0.35);
    const next = actions[name];
    if (!next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.35).play();
    activeClipRef.current = name;
  };

  // A gesture (or ambient fidget) clip finishing -- real playback length,
  // not a guessed duration -- clears the corresponding flag so the
  // useFrame loop below returns to idle (gestures) or schedules the next
  // fidget (ambient actions) on its next tick.
  useEffect(() => {
    if (!hasClips) return;
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action.getClip().name !== activeClipRef.current) return;
      if (state.gesture) {
        state.gesture = null;
      } else if (ambientPlayingRef.current) {
        ambientPlayingRef.current = false;
        ambientNextAtRef.current = performance.now() / 1000 + nextAmbientDelay();
      }
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [hasClips, mixer, state]);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const bones = bonesRef.current;
    const rest = restRef.current;

    if (hasClips) {
      const clipMap = clipMapRef.current;
      if (state.gesture && state.gestureStartedAt !== lastGestureStartRef.current) {
        // An explicit gesture (chat-triggered or clicked) always wins,
        // interrupting an ambient fidget mid-playback if one's running.
        lastGestureStartRef.current = state.gestureStartedAt;
        ambientPlayingRef.current = false;
        crossfadeTo(clipMap[state.gesture] ?? clipMap.idle, true);
      } else if (!state.gesture && !ambientPlayingRef.current) {
        if (activeClipRef.current !== clipMap.idle) {
          // A gesture (or ambient fidget) just ended -- settle back to idle.
          crossfadeTo(clipMap.idle, false);
        } else if (clipMap.ambientActions.length > 0 && t >= ambientNextAtRef.current) {
          // Idle fidget: a quick, one-off action clip, purely cosmetic --
          // never touches state.gesture, so it's invisible to anything
          // that actually cares whether a "real" gesture is playing (the
          // chat-triggered kind), and gets interrupted by one instantly.
          const clip =
            clipMap.ambientActions[Math.floor(Math.random() * clipMap.ambientActions.length)];
          ambientPlayingRef.current = true;
          crossfadeTo(clip, true);
        }
      }
    } else {
      if (bones.Hips) bones.Hips.position.y = hipsBaseY.current;

      let gestureProgress = 0;
      let activeGesture = state.gesture;
      if (activeGesture) {
        const elapsed = t - state.gestureStartedAt;
        const duration = GESTURE_DURATION_S[activeGesture];
        if (elapsed >= duration) {
          state.gesture = null;
          activeGesture = null;
        } else {
          gestureProgress = elapsed / duration;
        }
      }

      applyAmbientMotion(bones, rest, t, state.speaking);
      applyGesturePose(bones, rest, activeGesture, gestureProgress, t);
    }

    // Look-toward-pointer, layered on top (additive, small range) --
    // applied after either animation path so gestures/clips don't
    // overwrite it. Registered via its own useFrame call, which r3f runs
    // after useAnimations' internal mixer-update useFrame (hook call
    // order within the component determines this), so it's always acting
    // on this frame's freshly-posed bones, not last frame's.
    const head = bones.Head;
    if (head) {
      head.rotation.y += state.pointer.x * deg(12);
      head.rotation.x += -state.pointer.y * deg(8);
      // Slight talk tilt while speaking -- clip-based avatars only. The
      // procedural fallback (!hasClips) already gets an equivalent nod
      // baked into applyAmbientMotion above; adding this too would double
      // it up. Two different oscillation rates on two different axes (not
      // just one nod on one axis) so it reads as a small natural head
      // movement rather than a metronome.
      if (hasClips && state.speaking) {
        head.rotation.x += Math.sin(t * 7) * deg(2.5);
        head.rotation.z += Math.sin(t * 3.3) * deg(1.4);
      }
    }

    // Turn-to-face: damped toward 0 (facing camera) or -PI (turned away).
    // Applied to the root group, which no clip in this rig targets (clips
    // animate bones, not the group's own transform), so this and the mixer
    // don't fight. Bounds fitted the camera once on mount and doesn't
    // re-measure per frame, so rotating the model here doesn't make it
    // re-zoom mid-turn.
    //
    // -PI (not +PI): the CSS card and the three.js scene wind opposite
    // ways for the same visual sweep, so the figure needs the opposite
    // sign to turn the SAME on-screen direction as the photo card
    // (.hero-flip-inner.is-flipped: rotateY(180deg), 0.85s). lambda ~3
    // makes the turn take ~0.8s to match that transition's duration too,
    // so card and figure land together as one continuous motion.
    if (groupRef.current) {
      const targetTurn = facing === "back" ? -Math.PI : 0;
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetTurn,
        3,
        delta
      );
    }

    const lerpSpeed = 1 - Math.pow(0.001, delta); // frame-rate independent
    const targetMouthOpen = THREE.MathUtils.clamp(state.mouthOpen, 0, 1);

    // Mouth bar: grows taller with live amplitude, exactly like the
    // eyebrows' flat-bar stylization already on this face.
    if (mouthBarRef.current) {
      const targetHeight = THREE.MathUtils.lerp(
        MOUTH_BAR_HEIGHT_CLOSED,
        MOUTH_BAR_HEIGHT_OPEN,
        targetMouthOpen
      );
      mouthBarRef.current.scale.y = THREE.MathUtils.lerp(
        mouthBarRef.current.scale.y,
        targetHeight,
        lerpSpeed
      );
    }

    // Morph-target mouth driving (for a personalized avatar upload that
    // does ship real mouthOpen/mouthSmile morphs) -- a no-op when, as with
    // this bundled avatar, mouthMeshesRef is empty.
    const smileBase = state.speaking ? 0.15 : 0.05;
    for (const entry of mouthMeshesRef.current) {
      const influences = entry.mesh.morphTargetInfluences;
      if (!influences) continue;
      if (entry.open >= 0) {
        influences[entry.open] = THREE.MathUtils.lerp(
          influences[entry.open] ?? 0,
          targetMouthOpen,
          lerpSpeed
        );
      }
      if (entry.smile >= 0) {
        influences[entry.smile] = THREE.MathUtils.lerp(
          influences[entry.smile] ?? 0,
          smileBase,
          lerpSpeed
        );
      }
    }
  });

  const handleClick = () => {
    if (onFigureClick) {
      onFigureClick();
      return;
    }
    if (!state.gesture) {
      state.gesture = "wave";
      state.gestureStartedAt = performance.now() / 1000;
    }
  };

  return (
    <group ref={groupRef}>
      <primitive object={scene} onClick={handleClick} />
    </group>
  );
}

const AvatarCanvas = forwardRef<
  AvatarController,
  {
    avatarUrl?: string;
    className?: string;
    facing?: "front" | "back";
    onFigureClick?: () => void;
    // drei <Bounds> margin -- lower packs the figure tighter into the
    // canvas. Default 1.05 suits the wide in-hero/mobile boxes; FlipAvatar
    // overrides it lower because its portrait box is narrow enough that
    // the default leaves the figure looking small and lost in it.
    boundsMargin?: number;
  }
>(
  ({ avatarUrl, className, facing, onFigureClick, boundsMargin = 1.05 }, ref) => {
    const state = useRef<AvatarState>({
      gesture: null,
      gestureStartedAt: 0,
      mouthOpen: 0,
      speaking: false,
      pointer: { x: 0, y: 0 },
    }).current;

    const [active, setActive] = useState(
      typeof document === "undefined" || document.visibilityState !== "hidden"
    );

    useEffect(() => {
      const onVisibility = () => setActive(document.visibilityState !== "hidden");
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        triggerGesture: (name) => {
          state.gesture = name;
          state.gestureStartedAt = performance.now() / 1000;
        },
        setMouthOpen: (v) => {
          state.mouthOpen = v;
        },
        setSpeaking: (v) => {
          state.speaking = v;
        },
      }),
      [state]
    );

    const url = useMemo(() => avatarUrl || DEFAULT_AVATAR_URL, [avatarUrl]);
    // A state flag, not a CSS :hover -- this outer div isn't 3D-transformed
    // so the pointer events fire fine, but the glow it drives can sit
    // inside a preserve-3d flip card (FlipAvatar back face) where a CSS
    // :hover on a descendant wouldn't reliably match.
    const [hovered, setHovered] = useState(false);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };

    return (
      <div
        className={className}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {/* Unconditional "relative h-full w-full" wrapper, NOT the outer
            div above -- `className` is caller-controlled and its own
            `position` varies (absolute in the in-hero desktop layout,
            static in the docked-widget crop and mobile layouts; see every
            AvatarCanvas call site). Stacking a `relative` utility onto
            whatever `className` already sets is a real conflict when it's
            already `absolute`/`fixed` (both set the same CSS property;
            which one wins depends on Tailwind's class-generation order,
            not the order written here) and a silent no-op when it's
            static (the glow below would then anchor to some unrelated
            positioned ancestor much higher up the tree instead of this
            box). A dedicated inner wrapper we fully control sidesteps
            both failure modes regardless of what the caller passes in. */}
        <div className="relative h-full w-full">
          {/* Green glow via a drop-shadow on the (transparent-background)
              canvas element itself, not a separate shape behind it: the
              shadow traces the actual rendered figure's alpha, so it's
              silhouette-shaped rather than an approximating oval, and it
              matches the hero cutout photo's own glow exactly (same
              .green-silhouette-glow class, same hover grow/brighten).
              Purely a CSS post-process on the composited canvas output --
              it adds nothing to the WebGL scene, so <Bounds>'s camera fit
              (computed from scene geometry) is untouched, same reason the
              old oval was CSS too. Recomputed each frame since the canvas
              repaints each frame; measured fine at hero size for one
              element. */}
          <div
            className={`green-silhouette-glow h-full w-full ${
              hovered ? "green-silhouette-glow--hover" : ""
            }`}
          >
            <Canvas
              frameloop={active ? "always" : "never"}
              dpr={[1, 2]}
              camera={{ fov: 30, position: [0, 1.5, 3.2] }}
              onCreated={invalidateOnContextRestore}
            >
              <ambientLight intensity={0.75} />
              <directionalLight position={[2, 4, 3]} intensity={1.1} />
              <hemisphereLight intensity={0.25} groundColor="black" />
              <Suspense fallback={<CanvasLoader />}>
              {/* Auto-frames the avatar regardless of container aspect ratio --
                  same problem the Hero/Earth/Skills canvases solve by hand
                  (see FitZoom in Earth.tsx, FitOrthoCamera in TechBalls.tsx);
                  drei ships a purpose-built component for exactly this, so no
                  custom frustum math is needed here. margin controls how much
                  empty space Bounds leaves around the fitted figure -- lower
                  means a bigger-looking character within the same canvas.
                  maxDuration is near-zero deliberately: Bounds ANIMATES the
                  camera from the <Canvas> camera prop's fixed starting
                  position/distance to the fitted one by default (1s), which
                  read as the avatar swooping/dropping into place on every
                  mount -- including every remount crossing the docked/
                  undocked boundary (see AvatarExperience). The CSS "pop" the
                  container itself animates in with is the only entrance
                  motion wanted; the camera should already be at its final,
                  correctly-framed position by the very first rendered frame. */}
              <Bounds fit clip observe margin={boundsMargin} maxDuration={0.001}>
                <AvatarModel
                  url={url}
                  state={state}
                  facing={facing}
                  onFigureClick={onFigureClick}
                />
              </Bounds>
            </Suspense>
            </Canvas>
          </div>
        </div>
      </div>
    );
  }
);

AvatarCanvas.displayName = "AvatarCanvas";

useGLTF.preload(DEFAULT_AVATAR_URL);

export default AvatarCanvas;
