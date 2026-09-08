import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Preload } from "@react-three/drei";
import { random } from "maath";
import { Points as ThreePoints, TypedArray } from "three";

const Stars = (props: any) => {
  const ref = useRef<ThreePoints>(null);
  const [sphere] = useState<TypedArray>(() =>
    random.inSphere(new Float32Array(5001), { radius: 1.2 })
  );

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled {...props}>
        <PointMaterial
          transparent
          color="#00df9a"
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const StarsCanvas = () => {
  return (
    // fixed, not absolute: this now renders once for the whole page (see
    // Home.tsx) rather than scoped to one section's own wrapper -- fixed
    // pins it to the viewport regardless of scroll position or how tall
    // the actual page content is, which absolute (sized to a normal-flow
    // ancestor's own height) can't do without separately tracking the
    // full document height. pointer-events-none since it's purely
    // decorative, sitting behind everything anyway -- guards against a
    // WebGL canvas ever intercepting clicks meant for real page content.
    <div className="fixed inset-0 z-[-1] h-full w-full pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
          <Stars />
        </Suspense>

        <Preload all />
      </Canvas>
    </div>
  );
};

export default StarsCanvas;
