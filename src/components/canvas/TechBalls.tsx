import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Decal, Float, Html, Preload, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import type { TTechnology } from "../../types";

// One canvas per CATEGORY (not one per skill) -- each canvas is a real
// WebGL context, and browsers cap concurrent contexts (commonly ~8-16).
// One-per-skill (30+) blew past that limit and forced the browser to evict
// an older context (usually the Hero's), surfacing as "WebGLRenderer:
// Context Lost" and a white flash. A handful of category canvases stays
// well within the limit.
//
// Within a category, items wrap onto more rows past MAX_COLUMNS rather
// than all cramming into one line -- a category with many skills would
// otherwise force the camera so far back to fit them that every ball
// shrinks to near-nothing.
const SPACING = 4.2;
const BALL_SCALE = 1.7;
const MAX_COLUMNS = 6;
// Vertical headroom for one row: ball diameter, <Float>'s idle bob, and the
// name label below it.
const ROW_HEIGHT = 180;
// Fraction of the fitted frustum actually used -- leaves a small margin so
// nothing sits flush against the canvas edge.
const FIT_MARGIN = 0.88;

// A fixed perspective FOV/distance can only avoid cropping at ONE aspect
// ratio -- any container narrower or wider than that (a tablet width, a
// category with more/fewer columns) crops a different axis instead. This
// computes an orthographic frustum from the grid's actual content bounds
// and the canvas's actual pixel size every time either changes, so content
// fits regardless of aspect ratio -- letterboxed on the short axis rather
// than ever cropped on the long one.
const FitOrthoCamera = ({
  halfWidth,
  halfHeight,
}: {
  halfWidth: number;
  halfHeight: number;
}) => {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const canvasAspect = size.width / size.height;
    const contentAspect = halfWidth / halfHeight;

    let hw = halfWidth;
    let hh = halfHeight;
    if (canvasAspect > contentAspect) {
      hw = halfHeight * canvasAspect;
    } else {
      hh = halfWidth / canvasAspect;
    }
    hw /= FIT_MARGIN;
    hh /= FIT_MARGIN;

    cam.left = -hw;
    cam.right = hw;
    cam.top = hh;
    cam.bottom = -hh;
    cam.near = 0.1;
    cam.far = 100;
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, halfWidth, halfHeight]);

  return null;
};

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
  const meshRef = useRef<THREE.Mesh>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !meshRef.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    meshRef.current.rotation.y += dx * 0.01;
    meshRef.current.rotation.x += dy * 0.01;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const stopDragging = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <Float speed={1.75} rotationIntensity={0.4} floatIntensity={0.6}>
      <group position={position}>
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          scale={BALL_SCALE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
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
        <Html position={[0, -(BALL_SCALE + 0.6), 0]} center occlude={false}>
          <p className="text-secondary whitespace-nowrap text-[10px]">
            {name}
          </p>
        </Html>
      </group>
    </Float>
  );
};

// Renders one category's skills, wrapping onto more rows past MAX_COLUMNS,
// in a single shared canvas -- see the module comment above for why it's
// per-category rather than per-skill or one big shared canvas for everything.
const TechBallsRow = ({ technologies }: { technologies: TTechnology[] }) => {
  const columns = Math.max(1, Math.min(MAX_COLUMNS, technologies.length));
  const rowCount = Math.ceil(technologies.length / columns);

  const positions = useMemo<[number, number, number][]>(
    () =>
      technologies.map((_, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return [
          (col - (columns - 1) / 2) * SPACING,
          -(row - (rowCount - 1) / 2) * SPACING,
          0,
        ];
      }),
    [technologies, columns, rowCount]
  );

  // Content bounds: half-extent of the ball grid, plus the label sitting
  // below each ball and the idle float bob, so the fit camera above
  // accounts for everything that's actually drawn, not just ball centers.
  const halfWidth = ((columns - 1) * SPACING) / 2 + BALL_SCALE + 0.4;
  const halfHeight = ((rowCount - 1) * SPACING) / 2 + BALL_SCALE + 1.3;

  const height = ROW_HEIGHT * rowCount;

  return (
    <div style={{ height }}>
      <Canvas
        orthographic
        // "always" (not "demand"): the balls' idle <Float> bob and the
        // per-ball drag-rotation both mutate Object3D transforms directly
        // (not via state/invalidate), so "demand" mode would render one
        // static frame and never pick the changes up. These canvases are
        // cheap (a few low-poly icosahedrons each), so continuous rendering
        // costs nothing worth optimizing for.
        frameloop="always"
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <FitOrthoCamera halfWidth={halfWidth} halfHeight={halfHeight} />
        <Suspense fallback={<CanvasLoader />}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[0, 0, 5]} intensity={0.8} />
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

export default TechBallsRow;
