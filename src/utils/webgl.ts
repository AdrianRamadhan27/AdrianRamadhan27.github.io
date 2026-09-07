import type { RootState } from "@react-three/fiber";

// frameloop="demand" canvases only redraw when something calls invalidate()
// -- our own invalidate() calls all happen once, at mount (after finding
// the screen anchor, computing camera fit, etc). If the GPU context is
// lost and later restored (backgrounding a tab, a driver hiccup, resource
// pressure from too many contexts), three.js recovers the WebGL context
// automatically, but nothing then asks for a new frame -- the canvas would
// just stay blank/frozen post-restore. Pass this to a demand-mode Canvas's
// `onCreated` to fix that.
export function invalidateOnContextRestore(state: RootState) {
  state.gl.domElement.addEventListener("webglcontextrestored", () => {
    state.invalidate();
  });
}
