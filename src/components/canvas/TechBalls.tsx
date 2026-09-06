import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Decal,
  Float,
  Html,
  OrbitControls,
  Preload,
  useTexture,
} from "@react-three/drei";

import CanvasLoader from "../layout/Loader";
import type { TTechnology } from "../../types";

// One shared Canvas for every skill ball, instead of one Canvas per ball --
// each Canvas is a real WebGL context, and browsers cap concurrent contexts
// (commonly ~8-16). With 30+ skills, one-per-ball blew past that limit and
// forced the browser to evict an older context (usually the Hero's),
// surfacing as "WebGLRenderer: Context Lost" and a white flash.
const SPACING = 2.6;
const MAX_COLUMNS = 6;

const BallMesh = ({
  icon,
  name,
  position,
}: {
  icon: string;
  name: string;
  position: [number, number, number];
}) => {
  const decal = useTexture(icon);

  return (
    <Float speed={1.75} rotationIntensity={1} floatIntensity={1.5}>
      <group position={position}>
        <mesh castShadow receiveShadow scale={0.9}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#0d1f19"
            polygonOffset
            polygonOffsetFactor={-5}
            flatShading
          />
          <Decal
            position={[0, 0, 1]}
            rotation={[2 * Math.PI, 0, 6.25]}
            scale={1}
            map={decal}
            // @ts-expect-error -- flatShading isn't in Decal's material prop types
            flatShading
          />
        </mesh>
        <Html position={[0, -1.35, 0]} center distanceFactor={8} occlude={false}>
          <p className="text-secondary whitespace-nowrap text-[13px]">
            {name}
          </p>
        </Html>
      </group>
    </Float>
  );
};

const TechBallsCanvas = ({ technologies }: { technologies: TTechnology[] }) => {
  const columns = Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.ceil(Math.sqrt(technologies.length)))
  );
  const rows = Math.ceil(technologies.length / columns);

  const positions = useMemo<[number, number, number][]>(
    () =>
      technologies.map((_, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return [
          (col - (columns - 1) / 2) * SPACING,
          -(row - (rows - 1) / 2) * SPACING,
          0,
        ];
      }),
    [technologies, columns, rows]
  );

  const height = Math.max(360, rows * 170);

  return (
    <div style={{ height }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0, columns * 2.6], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[0, 0, 5]} intensity={0.8} />
          <OrbitControls enablePan={false} enableZoom={false} />
          {technologies.map((tech, i) => (
            <BallMesh
              key={tech.id ?? i}
              icon={tech.icon}
              name={tech.name}
              position={positions[i]}
            />
          ))}
        </Suspense>
        <Preload all />
      </Canvas>
    </div>
  );
};

export default TechBallsCanvas;
