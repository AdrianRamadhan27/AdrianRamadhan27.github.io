import { Suspense, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import * as THREE from "three";

import { useContent } from "../../hooks/useContent";

const PhotoPlane = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    // Gentle parallax toward the pointer instead of a full orbit — this sits
    // opposite the desktop model, not competing for attention.
    const targetY = (state.pointer.x * Math.PI) / 10;
    const targetX = (-state.pointer.y * Math.PI) / 14;
    groupRef.current.rotation.y +=
      (targetY - groupRef.current.rotation.y) * 0.05;
    groupRef.current.rotation.x +=
      (targetX - groupRef.current.rotation.x) * 0.05;
    invalidate();
  });

  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image ? image.width / image.height : 1;
  const height = 2.4;
  const width = height * aspect;

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
      <group ref={groupRef}>
        {/* soft green rim glow, slightly larger than the photo behind it */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[width + 0.3, height + 0.3]} />
          <meshBasicMaterial
            color="#00df9a"
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </Float>
  );
};

const PhotoCard = () => {
  const { profile } = useContent();
  if (!profile.photoUrl) return null;

  return (
    <group position={[5.2, 1, 0]}>
      <Suspense fallback={null}>
        <PhotoPlane url={profile.photoUrl} />
      </Suspense>
    </group>
  );
};

export default PhotoCard;
