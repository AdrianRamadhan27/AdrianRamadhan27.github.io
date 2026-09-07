import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import { invalidateOnContextRestore } from "../../utils/webgl";

const CAMERA_POSITION: [number, number, number] = [-4, 3, 6];
const CAMERA_FOV = 45;
// Approximate radius of the planet model including its decorative outer
// rings (there's no simple bounding sphere to query before the GLTF loads),
// tuned visually. See FitZoom below for why this exists at all.
const PLANET_RADIUS = 2.3;
const FIT_MARGIN = 0.85;

// A fixed camera position/fov only avoids cropping at one container aspect
// ratio -- any narrower or wider box (the contact card resizing, a
// different breakpoint) crops a different axis instead. OrbitControls
// (autoRotate) owns camera *position* once mounted and would just
// overwrite any position change we made here next frame, but `zoom` is
// independent of position, so adjusting it on resize guarantees the planet
// fits without fighting OrbitControls at all.
const FitZoom = () => {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const distance = new THREE.Vector3(...CAMERA_POSITION).length();
    const vFovRad = (CAMERA_FOV * Math.PI) / 180;
    const aspect = size.width / size.height;
    const zoomForHeight = (distance * Math.tan(vFovRad / 2)) / PLANET_RADIUS;
    const zoomForWidth = zoomForHeight * aspect;
    cam.zoom = Math.min(zoomForHeight, zoomForWidth) * FIT_MARGIN;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  return null;
};

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");

  return (
    <primitive object={earth.scene} scale={1.6} position-y={0} rotation-y={0} />
  );
};

const EarthCanvas = () => {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      camera={{
        fov: CAMERA_FOV,
        near: 0.1,
        far: 200,
        position: CAMERA_POSITION,
      }}
      onCreated={invalidateOnContextRestore}
    >
      <FitZoom />
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          autoRotate
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Earth />

        <Preload all />
      </Suspense>
    </Canvas>
  );
};

export default EarthCanvas;
