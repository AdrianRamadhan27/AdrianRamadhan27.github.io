import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import ScreenChat from "../chat/ScreenChat";
import PhotoCard from "./PhotoCard";

// GLTFLoader sanitizes the original "MY SCREEN" node name (spaces become
// underscores), so we match loosely rather than depend on the exact string.
const SCREEN_NAME_PATTERN = /MY[_ ]?SCREEN/i;

// three.js can't represent a mirror in a quaternion — matrixWorld.decompose()
// strips it into a (possibly negative) scale and returns a *clean* rotation.
// Our own chat UI is fresh content (not the baked, pre-mirrored screenshot
// the model shipped with), so the un-mirrored rotation should already read
// correctly. Flip this to true if a live check shows it backwards instead.
const FLIP_SCREEN_CONTENT = false;

// World-units-per-CSS-pixel for the projected chat. Arbitrary but must stay
// consistent with how screenSize below is turned back into a CSS pixel size.
const HTML_SCALE = 0.0016;

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

const Computers = () => {
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
    invalidate();
  }, [computer, invalidate]);

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
        position={[0, -4.25, -1.5]}
        rotation={[-0.01, -0.2, -0.1]}
      />

      {screen && (
        <group position={screen.position} quaternion={screen.quaternion}>
          <Html transform occlude scale={HTML_SCALE} zIndexRange={[10, 0]}>
            <div
              style={{
                width: `${screen.width / HTML_SCALE}px`,
                height: `${screen.height / HTML_SCALE}px`,
                transform: FLIP_SCREEN_CONTENT ? "scaleX(-1)" : undefined,
                overflow: "hidden",
                borderRadius: "4px",
              }}
            >
              <ScreenChat />
            </div>
          </Html>
        </group>
      )}
    </mesh>
  );
};

// Below this width the canvas doesn't render at all (see ComputersCanvas),
// so the chat has no monitor to project onto — it falls back to a plain panel.
const MOBILE_BREAKPOINT_PX = 640;

const ComputersCanvas = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    setIsMobile(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (isMobile) {
    return (
      <div className="mx-auto mt-8 h-[70vh] max-h-[520px] w-full max-w-md overflow-hidden rounded-2xl border border-[#00df9a]/30 shadow-lg">
        <ScreenChat compact />
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
    >
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Computers />
        <PhotoCard />
      </Suspense>
      <Preload all />
    </Canvas>
  );
};

export default ComputersCanvas;
