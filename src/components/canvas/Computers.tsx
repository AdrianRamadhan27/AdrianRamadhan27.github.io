import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import ScreenChat from "../chat/ScreenChat";
import { useContent } from "../../hooks/useContent";
import { useIsMobile } from "../../hooks/useIsMobile";
import { invalidateOnContextRestore } from "../../utils/webgl";
import type { TChatPublicSettings } from "../../types";

// GLTFLoader sanitizes the original "MY SCREEN" node name (spaces become
// underscores), so we match loosely rather than depend on the exact string.
const SCREEN_NAME_PATTERN = /MY[_ ]?SCREEN/i;

// three.js can't represent a mirror in a quaternion — matrixWorld.decompose()
// strips it into a (possibly negative) scale and returns a *clean* rotation.
// Our own chat UI is fresh content (not the baked, pre-mirrored screenshot
// the model shipped with), so the un-mirrored rotation should already read
// correctly. Flip this to true if a live check shows it backwards instead.
const FLIP_SCREEN_CONTENT = false;

// drei's <Html transform> "scale" prop is NOT a simple world-units-per-css-
// pixel factor -- empirically calibrated against this exact camera (fov 25,
// fixed OrbitControls distance) via a live render: at scale=1 a 400x210 css
// box rendered at ~933x491 screen px, centered correctly on the monitor, so
// only the magnitude needed correcting. Re-calibrate if the camera changes.
const SCREEN_CSS_WIDTH = 380;
const SCREEN_HTML_SCALE = 0.47;

function findScreenMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((child) => {
    if (!found && SCREEN_NAME_PATTERN.test(child.name) && (child as THREE.Mesh).isMesh) {
      found = child as THREE.Mesh;
    }
  });
  return found;
}

type ScreenAnchor = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  width: number;
  height: number;
};

const Computers = ({ chatPublic }: { chatPublic: TChatPublicSettings }) => {
  const computer = useGLTF("./desktop_pc/scene.gltf");
  const { invalidate } = useThree();
  const [screen, setScreen] = useState<ScreenAnchor | null>(null);

  useEffect(() => {
    const screenMesh = findScreenMesh(computer.scene);
    if (!screenMesh) return;

    // Kill the baked VS Code screenshot the model ships with so it doesn't
    // bleed through behind the chat UI.
    const material = screenMesh.material as THREE.MeshStandardMaterial | undefined;
    if (material) {
      material.map = null;
      material.emissiveMap = null;
      material.emissive = new THREE.Color("#001a12");
      material.emissiveIntensity = 0.3;
      material.color = new THREE.Color("#010302");
      material.needsUpdate = true;
    }

    screenMesh.updateWorldMatrix(true, false);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    screenMesh.matrixWorld.decompose(position, quaternion, scale);

    screenMesh.geometry.computeBoundingBox();
    const bbox = screenMesh.geometry.boundingBox;
    const localWidth = bbox ? bbox.max.x - bbox.min.x : 1.9;
    const localHeight = bbox ? bbox.max.y - bbox.min.y : 1.0;

    setScreen({
      position,
      quaternion,
      width: Math.abs(localWidth * scale.x),
      height: Math.abs(localHeight * scale.y),
    });
  }, [computer]);

  // Separate effect, keyed on `screen` itself rather than folded into the
  // effect above -- this is what fixes the chat sometimes landing pinned
  // near the canvas's top-left corner on first load until the camera is
  // dragged. drei's <Html transform> only computes its CSS matrix inside
  // its own useFrame; under frameloop="demand" that only runs on a frame
  // we explicitly request. Calling invalidate() in the SAME effect that
  // calls setScreen() races React's own commit: that invalidate() call
  // schedules a render via requestAnimationFrame while <Html> (gated on
  // `{screen && ...}`) hasn't been mounted into the tree yet, so the frame
  // it produces has nothing to position -- Html's default un-positioned
  // CSS is left standing until something else (OrbitControls calls
  // invalidate() on every drag) finally produces a frame with Html
  // already mounted.
  //
  // A single invalidate() here (after React has committed the mount,
  // since effects always run post-commit) closes the most common version
  // of that race, but not all of it -- verified via repeated fresh loads,
  // roughly 1 in 6 still landed wrong. The remaining gap is a second,
  // narrower race: Html's positioning useFrame reads `size` (the canvas's
  // CSS pixel dimensions from useThree) and the camera's matrices, both of
  // which can still be settling for a frame or two right after a mount
  // this heavy (a freshly-parsed GLTF plus the screen's own effect-driven
  // layout). One invalidate() only guarantees ONE frame renders, not that
  // that specific frame lands after everything else has settled. Rather
  // than chase the exact remaining sequencing, a short burst of frames
  // converges regardless of exactly which one it is that finally has
  // correct data -- cheap (a few frames, once, only right after the
  // screen anchor is found) and robust to timing variance across
  // machines/browsers rather than tuned to this one's.
  useEffect(() => {
    if (!screen) return;
    let frame = 0;
    let rafId: number;
    const tick = () => {
      invalidate();
      frame += 1;
      if (frame < 10) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [screen, invalidate]);

  return (
    <mesh>
      <hemisphereLight intensity={0.15} groundColor="black" />
      <spotLight
        position={[-20, 50, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />
      <pointLight intensity={1} />
      <primitive
        object={computer.scene}
        scale={0.75}
        position={[0, -3.2, -1.5]}
        rotation={[-0.01, -0.2, -0.1]}
      />

      {screen && (
        <>
          {/* The original template's bright, self-illuminated VS Code
              screenshot doubled as the scene's key light on the desk --
              emissive materials don't actually cast light onto neighboring
              geometry, but a very bright surface still reads as one. We
              deliberately dimmed the screen to make room for the chat UI,
              which took that glow with it. A spotlight aimed outward from
              the screen would look more like a real monitor's glow, but
              neither the screen node's own quaternion nor the fixed camera
              direction turned out to be a reliable "outward" direction for
              this particular (mirrored, oddly-composed) GLTF node -- both
              landed the cone somewhere not visibly hitting the desk when
              tested at extreme intensity. A point light colocated with the
              screen is proven to reach the desk (omnidirectional, so it
              doesn't depend on getting a direction right) and, positioned
              this close, still concentrates its visible falloff tightly
              around the monitor -- reading as the screen itself glowing. */}
          <pointLight
            position={screen.position}
            color="#00df9a"
            intensity={35}
            distance={14}
            decay={1.6}
          />
          <group position={screen.position} quaternion={screen.quaternion}>
            {/* occlude (raycast) off deliberately: we always want the chat
                showing here regardless of viewing angle, and it's a fragile
                check anyway -- it misfired after nudging the model's position
                by about a unit, hiding the whole overlay because it decided
                (incorrectly) something else in the model was in front of it. */}
            <Html transform scale={SCREEN_HTML_SCALE} zIndexRange={[10, 0]}>
              <div
                style={{
                  width: `${SCREEN_CSS_WIDTH}px`,
                  height: `${SCREEN_CSS_WIDTH / (screen.width / screen.height)}px`,
                  transform: FLIP_SCREEN_CONTENT ? "scaleX(-1)" : undefined,
                  overflow: "hidden",
                  borderRadius: "4px",
                }}
              >
                <ScreenChat chatPublic={chatPublic} />
              </div>
            </Html>
          </group>
        </>
      )}
    </mesh>
  );
};

// Below this width the canvas doesn't render at all (see ComputersCanvas),
// so the chat has no monitor to project onto — it falls back to a plain panel.
const MOBILE_BREAKPOINT_PX = 640;

const ComputersCanvas = () => {
  // Read here, not inside Computers/ScreenChat -- this component sits
  // outside the Canvas in the normal React tree, so it's the right place
  // to read context before threading it down as a plain prop.
  const { chatPublic } = useContent();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT_PX);

  if (isMobile) {
    return (
      <div className="mt-8 px-6">
        <div className="mx-auto h-[52vh] max-h-[420px] w-full max-w-md overflow-hidden rounded-2xl border border-[#00df9a]/30 shadow-lg">
          <ScreenChat compact chatPublic={chatPublic} />
        </div>
      </div>
    );
  }

  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 2]}
      camera={{ position: [20, 3, 5], fov: 25 }}
      gl={{ preserveDrawingBuffer: true }}
      onCreated={invalidateOnContextRestore}
    >
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Computers chatPublic={chatPublic} />
      </Suspense>
      <Preload all />
    </Canvas>
  );
};

export default ComputersCanvas;
