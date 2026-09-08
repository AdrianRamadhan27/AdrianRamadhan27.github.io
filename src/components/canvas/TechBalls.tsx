import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Decal, Float, Html, Preload, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import Glow from "./Glow";
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

// Must match the hoverScale passed to <Glow> in BallMesh below -- the
// frustum-fitting math further down pads by this (the glow's own biggest
// possible half-extent), not just BALL_SCALE, specifically so a hovered
// ball's fully-grown glow on an edge/top/bottom row never exceeds the
// fitted camera bounds and gets clipped at the canvas edge (confirmed via
// screenshot: with only BALL_SCALE as padding, the top row's glow at full
// hover size visibly poked past the top of the canvas).
const GLOW_HOVER_SCALE = BALL_SCALE * 3.3;
const GLOW_HALF_EXTENT = GLOW_HOVER_SCALE / 2;

// Folds an arbitrary (possibly many-full-turns-accumulated) angle down to
// its shortest-path equivalent in [-PI, PI] -- used by the hover "snap
// back to front-facing" lerp in BallMesh so it always takes the short way
// round instead of unwinding however many full rotations it's spun through.
function wrapAngle(angle: number): number {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

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
  centerY,
}: {
  halfWidth: number;
  halfHeight: number;
  centerY: number;
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
    cam.top = centerY + hh;
    cam.bottom = centerY - hh;
    cam.near = 0.1;
    cam.far = 100;
    cam.position.set(0, centerY, 10);
    cam.lookAt(0, centerY, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, halfWidth, halfHeight, centerY]);

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
  const [hovered, setHovered] = useState(false);

  // Randomized once per ball (stable across re-renders via useRef's lazy
  // initializer, never recomputed) -- both the starting orientation AND
  // the per-axis speed differ ball to ball, so a whole row never reads as
  // one synchronized mechanism turning in lockstep.
  const spin = useRef({
    speedY: 0.35 + Math.random() * 0.35,
    speedX: 0.12 + Math.random() * 0.18,
    // Alternates spin direction too, not just speed -- same reasoning.
    dirY: Math.random() < 0.5 ? 1 : -1,
    dirX: Math.random() < 0.5 ? 1 : -1,
  }).current;

  useEffect(() => {
    meshRef.current?.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      0
    );
  }, []);

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

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  // Continuous idle tumble, independent of <Float>'s own oscillating sway
  // below (that one nudges the ball back and forth a few degrees; this is
  // a real, ongoing rotation). Under this row's ORTHOGRAPHIC camera a
  // sphere's silhouette never changes no matter how it turns, so a
  // perfectly smooth ball spinning wouldn't actually look like it's
  // moving at all -- what sells the rotation here is the icosahedron's
  // flatShading (each low-poly facet catches the fixed directional light
  // differently as it turns, a visible glint sweeping across the surface)
  // and the decal sliding around and periodically off the visible face --
  // onto the back one (see the second <Decal> below) rather than into
  // nothing. Two axes, not one, so it reads as a genuine tumble rather
  // than a flat disc spinning in place. Paused while the visitor is
  // actively drag-rotating it themselves (below) rather than fighting
  // that gesture.
  //
  // Hovering locks it back to the canonical front-facing orientation
  // (rotation 0,0 -- where the front Decal, at local position [0,0,1],
  // naturally faces the camera) via the SHORTEST path: wrapAngle folds
  // whatever the current accumulated angle is down to its [-PI, PI]
  // equivalent first, since lerping the raw accumulated value straight
  // toward 0 would spin it backward through however many full turns it's
  // already made rather than snapping the short way round.
  useFrame((_, delta) => {
    if (dragging.current || !meshRef.current) return;
    if (hovered) {
      const lerpSpeed = 1 - Math.pow(0.001, delta);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        wrapAngle(meshRef.current.rotation.y),
        0,
        lerpSpeed
      );
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        wrapAngle(meshRef.current.rotation.x),
        0,
        lerpSpeed
      );
      return;
    }
    meshRef.current.rotation.y += delta * spin.speedY * spin.dirY;
    meshRef.current.rotation.x += delta * spin.speedX * spin.dirX;
  });

  return (
    <Float speed={1.75} rotationIntensity={0.9} floatIntensity={1.4}>
      <group position={position}>
        {/* Sits just behind the ball along the camera's fixed viewing axis
            (this row's <Canvas orthographic> always looks straight down -Z,
            so a plain +Z-facing plane is already "facing the camera" with
            no billboard math needed) -- grows and brightens on hover, same
            highlight treatment as the avatar hero's own glow. Safe to add
            here specifically because this row's camera frustum is computed
            by hand from the grid layout (see FitOrthoCamera/halfWidth/
            halfHeight below), not auto-fit from the scene's actual bounding
            box -- unlike the avatar, an extra plane here can't throw the
            framing off. */}
        <Glow
          hovered={hovered}
          baseScale={BALL_SCALE * 2.4}
          hoverScale={GLOW_HOVER_SCALE}
          baseOpacity={0.4}
          hoverOpacity={0.7}
          position={[0, 0, -0.4]}
        />
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          scale={BALL_SCALE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
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
          {/* Same logo again on the opposite face -- with the ball now
              tumbling continuously (see the useFrame above), the front
              decal spends real time rotated out of view; without a back
              one too it would just show blank dark surface for that
              stretch instead of the logo the whole time. Y-rotated 180°
              from the front one so it projects outward from the back
              hemisphere instead of through the same +Z side; the extra Z
              term compensates so the image reads right way round (not
              mirrored) from that side, verified empirically by rendering
              the mesh forced to a rotation that faces the back decal
              toward the camera and checking it wasn't backwards. */}
          <Decal
            position={[0, 0, -1]}
            rotation={[2 * Math.PI, Math.PI, -6.25]}
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

  // Content bounds. The label sits *below* each ball with nothing balancing
  // it above, so treating the grid as vertically symmetric (as if halfHeight
  // applied evenly on both sides) wastes that same amount of empty space
  // above the balls too -- which is exactly the "gap under the heading"
  // this was tuned to close. Computing the true top/bottom extent and
  // centering the frustum on their midpoint (via centerY) removes it.
  // Padded by GLOW_HALF_EXTENT (a hovered ball's fully-grown glow), not
  // just BALL_SCALE (the ball's own radius) -- see that constant's comment.
  const halfWidth = ((columns - 1) * SPACING) / 2 + GLOW_HALF_EXTENT;
  const rowsHalfSpan = ((rowCount - 1) * SPACING) / 2;
  const topExtent = rowsHalfSpan + GLOW_HALF_EXTENT;
  const bottomExtent = rowsHalfSpan + GLOW_HALF_EXTENT + 0.6 + 0.3; // label anchor offset + approx label height
  const halfHeight = (topExtent + bottomExtent) / 2;
  const centerY = (topExtent - bottomExtent) / 2;

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
        <FitOrthoCamera halfWidth={halfWidth} halfHeight={halfHeight} centerY={centerY} />
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
