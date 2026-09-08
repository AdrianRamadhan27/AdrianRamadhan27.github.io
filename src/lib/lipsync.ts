// Drives the avatar's mouthOpen morph target from the live amplitude of
// whatever audio is currently playing through one shared <audio> element.
//
// This is deliberately the amplitude-driven fallback approach rather than a
// full phoneme/viseme classifier (e.g. wawa-lipsync): the stock avatar (see
// public/avatar/license.txt) only ships two mouth morphs, mouthOpen and
// mouthSmile -- there's no 15-shape viseme set to classify into. If a future
// avatar upload adds real visemes, this can be swapped for a classifier
// without changing anything else in the pipeline (AvatarController.setMouthOpen
// only ever wants a single 0..1 number).
export class LipsyncDriver {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private readonly audioEl: HTMLAudioElement;

  constructor(audioEl: HTMLAudioElement) {
    this.audioEl = audioEl;
  }

  // Must be called synchronously inside a user-gesture handler (mic press,
  // send click, first interaction) -- browsers only allow an AudioContext
  // to actually start/resume there, and a suspended context yields no
  // analyser data at all (silently -- audio still plays normally, which is
  // exactly the "looks broken but isn't obviously broken" trap noted while
  // planning this).
  ensureContext(): void {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") void this.audioCtx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctx();
    // createMediaElementSource may only be called ONCE per <audio> element
    // for its whole lifetime -- this class assumes exactly one shared,
    // reused element for the whole session (see AvatarExperience), never a
    // fresh <audio> per reply.
    const source = this.audioCtx.createMediaElementSource(this.audioEl);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    // Allocated from an explicit ArrayBuffer (not `new Uint8Array(n)`) --
    // newer TS DOM lib types AnalyserNode.getByteTimeDomainData as wanting
    // Uint8Array<ArrayBuffer> specifically, which the plain numeric
    // constructor no longer satisfies under strict generic typed arrays.
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  /** Instantaneous 0..1 amplitude estimate. Safe to call every animation frame. */
  read(): number {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteTimeDomainData(this.data);
    let sumSquares = 0;
    for (const sample of this.data) {
      const normalized = (sample - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.data.length);
    // Speech RMS rarely approaches 1 on this scale -- a flat gain keeps the
    // mouth from barely moving on quieter passages. Clamped either way.
    return Math.min(1, rms * 4.5);
  }
}
