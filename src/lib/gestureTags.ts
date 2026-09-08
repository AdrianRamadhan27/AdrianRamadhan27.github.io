// The chat edge function instructs the model (only in avatar hero mode) to
// emit inline tags like "[gesture:wave]" when a reply calls for a body
// gesture. These must never reach the visible chat bubble -- this module
// strips them out of a chunked text stream before it's typed out.
//
// A tag can straddle two separate SSE chunks (e.g. "...ok![gesture:wa" then
// "ve] sure thing"), so a naive per-chunk regex strip would let half a tag
// slip through. This keeps a small carry-over buffer instead: anything that
// could still grow into a complete tag is held back until it either
// resolves into one or is proven not to be one.
export type GestureName = "wave" | "jumping_jacks" | "dance";
export const GESTURE_NAMES: GestureName[] = ["wave", "jumping_jacks", "dance"];

const TAG_RE = /\[gesture:(wave|jumping_jacks|dance)\]/g;
const CANDIDATE_TAGS = GESTURE_NAMES.map((n) => `[gesture:${n}]`);
const MAX_TAG_LEN = Math.max(...CANDIDATE_TAGS.map((t) => t.length));

function isGrowingIntoATag(tail: string): boolean {
  return tail.length <= MAX_TAG_LEN && CANDIDATE_TAGS.some((t) => t.startsWith(tail));
}

export type GestureStripper = {
  /** Feed the next chunk of streamed text; returns the portion safe to
   *  reveal now (with any complete tags removed and reported via onGesture). */
  push: (chunk: string) => string;
  /** Call once the stream ends -- flushes anything still held back
   *  (a trailing "[" that never grew into a full tag turns out to just be
   *  a literal bracket in the reply, so it's emitted as-is). */
  flush: () => string;
};

export function createGestureStripper(onGesture: (name: GestureName) => void): GestureStripper {
  let buffer = "";

  return {
    push(chunk) {
      buffer += chunk;
      let visible = "";

      for (;;) {
        TAG_RE.lastIndex = 0;
        const match = TAG_RE.exec(buffer);
        if (!match) break;
        visible += buffer.slice(0, match.index);
        onGesture(match[1] as GestureName);
        buffer = buffer.slice(match.index + match[0].length);
      }

      const lastBracket = buffer.lastIndexOf("[");
      if (lastBracket !== -1 && isGrowingIntoATag(buffer.slice(lastBracket))) {
        visible += buffer.slice(0, lastBracket);
        buffer = buffer.slice(lastBracket);
        return visible;
      }

      visible += buffer;
      buffer = "";
      return visible;
    },
    flush() {
      const rest = buffer;
      buffer = "";
      return rest;
    },
  };
}
