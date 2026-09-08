import * as THREE from "three";

let cached: THREE.Texture | null = null;

// A soft radial-gradient sprite (white center fading to fully transparent
// at the edge), generated once at runtime via an offscreen canvas rather
// than shipping a PNG asset. Left uncolored deliberately -- each user
// tints it via the mesh's own material `color`, so one shared texture
// instance (module-level cache, not per-component) works for every glow
// regardless of what color it's used for.
export function getGlowTexture(): THREE.Texture {
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
