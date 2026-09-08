import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getGlowTexture } from "../../utils/glowTexture";

// A flat, additive-blended radial-gradient sprite meant to sit just behind
// an object as a soft "highlighted" glow -- used by TechBalls (a skill
// ball) and anywhere else a real in-scene glow (as opposed to a CSS one --
// see AvatarCanvas, which needs the CSS version instead; its camera framing
// is auto-computed from the scene's bounding box via drei's Bounds, and
// adding extra geometry for it to measure would throw that off) makes
// sense. Faces +Z by default (a plain PlaneGeometry's own orientation),
// which only reads as "facing the camera" for a camera that's looking
// straight down -Z at a fixed angle -- true for TechBalls' orthographic
// camera, NOT true for anything that orbits or has a perspective camera at
// an angle, which would need real billboarding instead.
//
// scale/opacity animate toward the hover target every frame (frame-rate
// independent lerp, same pattern used throughout Avatar.tsx) rather than
// snapping instantly, so the "intensity grows on hover" reads as a genuine
// glow swelling rather than a hard cut.
const Glow = ({
  hovered,
  baseScale,
  hoverScale,
  baseOpacity = 0.55,
  hoverOpacity = 1,
  color = "#00df9a",
  position = [0, 0, 0] as [number, number, number],
}: {
  hovered: boolean;
  baseScale: number;
  hoverScale: number;
  baseOpacity?: number;
  hoverOpacity?: number;
  color?: string;
  position?: [number, number, number];
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const lerpSpeed = 1 - Math.pow(0.0005, delta);
    const targetScale = hovered ? hoverScale : baseScale;
    const targetOpacity = hovered ? hoverOpacity : baseOpacity;
    if (meshRef.current) {
      const next = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, lerpSpeed);
      meshRef.current.scale.setScalar(next);
    }
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        targetOpacity,
        lerpSpeed
      );
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={baseScale} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={baseOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

export default Glow;
