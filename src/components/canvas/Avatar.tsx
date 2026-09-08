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
import { Bounds, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import { invalidateOnContextRestore } from "../../utils/webgl";

// Bundled fallback avatar -- see public/avatar/license.txt for provenance
// (a Ready Player Me-format export bundled in three.js's own MIT-licensed
// repo; RPM the company/service is gone, this leftover file isn't). The
// CMS can point avatar_path at a different upload at any time; this only
// renders when that's unset.
const DEFAULT_AVATAR_URL = "./avatar/model.glb";

// This rig ships with NO baked animations (see license.txt for why: proper
// Mixamo retargeting needs Mixamo's interactive web auto-rigger, which
// isn't scriptable). Gestures below are procedural -- driven by rotating
// named bones with sine waves rather than played from motion-capture clips.
// It looks less natural than real mocap but needs nothing beyond this file,
// and every angle here is a named constant specifically so it's easy to
// retune by eye later.
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

// The bundled stock avatar's headwear mesh is a wide-brimmed hat that hides
// most of the face -- defeating the entire point of a talking, lip-synced
// avatar. Hidden unconditionally; a personalized avatar upload can ship
// its own headwear (or none) and this simply won't find anything to hide.
const HIDDEN_MESH_NAMES = ["Wolf3D_Headwear"];

export type GestureName = "wave" | "jumping_jacks" | "dance";
const GESTURE_DURATION_S: Record<GestureName, number> = {
  wave: 2.2,
  jumping_jacks: 3.4,
  dance: 4.2,
};

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

function deg(d: number) {
  return THREE.MathUtils.degToRad(d);
}

// Adds a small talking sway (subtle, so it doesn't fight whatever gesture
// or idle pose is already applied) and, independently, always-on idle
// breathing -- both run continuously regardless of the active gesture so
// the avatar never looks perfectly frozen.
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
  const setLocal = (
    name: BoneName,
    x?: number,
    y?: number,
    z?: number
  ) => {
    const bone = bones[name];
    const r = rest[name];
    if (!bone || !r) return;
    if (x !== undefined) bone.rotation.x = r.x + x;
    if (y !== undefined) bone.rotation.y = r.y + y;
    if (z !== undefined) bone.rotation.z = r.z + z;
  };

  // This bundled avatar's bind pose (rest, 0 offset everywhere) is a
  // T-pose -- arms out horizontal, as GLTF/FBX rigs almost always ship,
  // since a natural standing pose is something an animation applies, never
  // the raw skeleton. Applied unconditionally (not just when idle) so
  // gestures below, which only touch Arm/ForeArm/leg/hip/spine bones,
  // layer their own rotations on top of an already-natural shoulder
  // baseline instead of the raw T-pose.
  //
  // Counter-intuitively the fix lives on the SHOULDER bone, not the Arm
  // bone -- confirmed empirically (live bone inspection against the actual
  // rig, not guessed): zeroing the Arm bone's own rest rotation left the
  // T-pose completely unchanged, proving it contributes ~nothing to the
  // visible silhouette. The Shoulder bone's rest X (~89 degrees) is what
  // actually swings the arm out sideways; rotating it further past rest
  // (rather than back toward 0, which swings the arm UP overhead instead)
  // brings it down to a natural hang.
  setLocal("LeftShoulder", deg(80), 0, 0);
  setLocal("RightShoulder", deg(80), 0, 0);

  if (gesture === "wave") {
    // Ramp the arm up for the first 20% of the gesture, wave for the
    // middle, ease back down for the last 20% -- avoids a hard snap back
    // to idle when the gesture ends.
    const raiseEnvelope =
      progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
    setLocal("RightArm", 0, 0, -deg(100) * raiseEnvelope);
    setLocal("RightForeArm", 0, deg(20), -deg(30 + Math.sin(t * 14) * 20) * raiseEnvelope);
    return;
  }

  if (gesture === "jumping_jacks") {
    const cycle = Math.sin(t * 9); // -1..1
    const spread = (cycle + 1) / 2; // 0..1
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
  // Some rigs ship lowercase/differently-cased viseme keys (seen with a
  // couple of third-party exports) -- match case-insensitively as a
  // fallback rather than silently never firing.
  const key = Object.keys(dict).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? dict[key] : -1;
}

function AvatarModel({
  url,
  state,
}: {
  url: string;
  state: AvatarState;
}) {
  const { scene } = useGLTF(url);

  const bonesRef = useRef<Partial<Record<BoneName, THREE.Bone>>>({});
  const restRef = useRef<Partial<Record<BoneName, THREE.Euler>>>({});
  const mouthMeshesRef = useRef<
    { mesh: THREE.SkinnedMesh; open: number; smile: number }[]
  >([]);
  const hipsBaseY = useRef(0);

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
  }, [scene]);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const bones = bonesRef.current;
    const rest = restRef.current;

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

    // Look-toward-pointer, layered on top (additive, small range) --
    // applied last so gestures/ambient motion don't fight it.
    const head = bones.Head;
    if (head) {
      head.rotation.y += state.pointer.x * deg(12);
      head.rotation.x += -state.pointer.y * deg(8);
    }

    const targetOpen = THREE.MathUtils.clamp(state.mouthOpen, 0, 1);
    const smileBase = state.speaking ? 0.15 : 0.05;
    const lerpSpeed = 1 - Math.pow(0.001, delta); // frame-rate independent
    for (const entry of mouthMeshesRef.current) {
      const influences = entry.mesh.morphTargetInfluences;
      if (!influences) continue;
      if (entry.open >= 0) {
        influences[entry.open] = THREE.MathUtils.lerp(
          influences[entry.open] ?? 0,
          targetOpen,
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
    if (!state.gesture) {
      state.gesture = "wave";
      state.gestureStartedAt = performance.now() / 1000;
    }
  };

  return <primitive object={scene} onClick={handleClick} />;
}

const AvatarCanvas = forwardRef<
  AvatarController,
  { avatarUrl?: string; className?: string }
>(({ avatarUrl, className }, ref) => {
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  };

  return (
    <div className={className} onPointerMove={handlePointerMove}>
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
              custom frustum math is needed here. */}
          <Bounds fit clip observe margin={1.35}>
            <AvatarModel url={url} state={state} />
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
});

AvatarCanvas.displayName = "AvatarCanvas";

useGLTF.preload(DEFAULT_AVATAR_URL);

export default AvatarCanvas;
