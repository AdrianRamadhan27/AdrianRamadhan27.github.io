// Plays a synthesized-speech reply as it streams in over the network,
// instead of waiting for the whole reply to finish generating.
//
// The `speak` edge function requests response_format: "pcm" but empirically
// (probing the live endpoint directly) the provider ignores that and always
// returns real MP3 (Content-Type: audio/mpeg, bytes starting with the FF FB
// frame-sync header) -- an earlier version of this file assumed raw PCM per
// the OpenAI convention and fed the MP3 bytes straight into an AudioWorklet
// as if they were signed 16-bit samples, which is why it played as static.
// There's no cheap browser API for incrementally decoding a *compressed*
// stream sample-by-sample (MediaSource doesn't reliably support audio/mpeg
// across browsers), so instead: re-decode the growing byte buffer on every
// chunk via decodeAudioData (tolerates a trailing incomplete frame -- it
// just decodes whatever whole frames are present) and schedule only the
// newly-decoded tail for playback, immediately after whatever's already
// scheduled. For a short TTS reply (capped at 600 chars server-side) the
// redundant re-decoding of a handful of chunks is negligible cost, and this
// still starts audio well before the full reply has finished generating.
//
// Lip sync taps an AnalyserNode wired into this same graph -- no <audio>
// element, so no CORS-taint risk at all (see the older lipsync.ts this
// replaced, which had to dodge that by using a same-origin blob URL).
//
// MP3 duration estimates are NOT stable across repeated decodeAudioData
// calls on a growing buffer -- the trailing edge of each intermediate
// decode is the least reliable part (an in-progress final frame, or a
// VBR/Xing header estimate that shifts as more of the stream arrives) and
// re-estimating it differently pass to pass causes exactly the symptom
// this was built to fix: audio (and the amplitude read() reports) that
// keeps going, or briefly hiccups, past where the real content actually
// ends. Standard mitigation for this well-known class of progressive-MP3-
// via-decodeAudioData bug: don't schedule right up to each intermediate
// decode's bleeding edge -- hold back a small trailing margin and let a
// later, more-complete decode pick it up once it's stable. finish() (see
// below) does one last decode with NO margin once the network stream is
// fully read, so nothing is ever permanently lost, only deferred.
const TRAILING_SAFETY_MARGIN_S = 0.2;

// Lossy MP3 encoding rarely produces byte-exact digital silence even for a
// true pause between sentences (quantization noise/dither), so read()'s
// raw RMS never quite reaches 0 -- and with no deadzone, the mouth-bar's
// continuous lerp toward that value in Avatar.tsx means it never fully
// closes either, reading as "stuck slightly open" at every pause and after
// the reply ends. Anything below this floor is treated as true silence;
// the remaining range is rescaled back up to 0..1 so loud speech still
// reaches a fully-open mouth.
const NOISE_GATE = 0.03;

// RMS a genuinely loud passage reaches (checked empirically against a real
// captured TTS clip: peaked around 0.47) -- read() maps this up to a fully
// open mouth, so louder moments don't need to be pushed even further to
// saturate.
const PEAK_RMS = 0.35;

export class AudioStreamPlayer {
  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private data: Uint8Array<ArrayBuffer>;

  private chunks: Uint8Array[] = [];
  private totalBytes = 0;
  private decoding = false;
  private pendingRedecode = false;
  private streamEnded = false;
  private playedDuration = 0; // seconds of audio already scheduled
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private generation = 0; // bumped by stop() to invalidate in-flight decodes

  constructor() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctx();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.6;
    this.analyser.connect(this.audioCtx.destination);
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  // Must be awaited from within a synchronous user-gesture call chain (see
  // AvatarExperience's unlockAudio) -- resuming a suspended AudioContext is
  // gated by the browser's autoplay policy to a real user interaction.
  async ensureReady(): Promise<void> {
    if (this.audioCtx.state === "suspended") await this.audioCtx.resume();
  }

  /** Feed the next chunk of MP3 bytes as they arrive from the network. */
  pushBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.totalBytes += bytes.length;
    void this.scheduleDecode();
  }

  private async scheduleDecode(): Promise<void> {
    if (this.decoding) {
      this.pendingRedecode = true;
      return;
    }
    this.decoding = true;
    const myGeneration = this.generation;
    try {
      // decodeAudioData detaches/consumes the ArrayBuffer it's given, so
      // hand it a fresh copy each time and keep the original chunks around
      // for the next (larger) attempt.
      const combined = new Uint8Array(this.totalBytes);
      let offset = 0;
      for (const chunk of this.chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await this.audioCtx.decodeAudioData(combined.buffer);
      } catch {
        // Not enough bytes yet for a decodable frame -- try again once more
        // data has arrived.
        return;
      }

      // A stop() (barge-in) happened while this decode was in flight --
      // don't schedule stale audio from a cancelled reply.
      if (myGeneration !== this.generation) return;

      // Hold back a trailing margin on every pass except the final one
      // (streamEnded) -- see the class-level comment on why the very tail
      // of an intermediate decode isn't trustworthy yet.
      const target = this.streamEnded
        ? audioBuffer.duration
        : Math.max(this.playedDuration, audioBuffer.duration - TRAILING_SAFETY_MARGIN_S);

      if (target > this.playedDuration + 0.001) {
        const startOffset = this.playedDuration;
        const playDuration = target - startOffset;
        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.analyser);

        const when = Math.max(this.audioCtx.currentTime, this.nextStartTime);
        source.start(when, startOffset, playDuration);
        this.nextStartTime = when + playDuration;
        this.playedDuration = target;
        this.activeSources.push(source);
        source.onended = () => {
          this.activeSources = this.activeSources.filter((s) => s !== source);
        };
      }
    } finally {
      this.decoding = false;
      if (this.pendingRedecode) {
        this.pendingRedecode = false;
        void this.scheduleDecode();
      }
    }
  }

  /** Call once the network stream is fully read (no more pushBytes calls
   *  coming for this reply) -- triggers one final decode pass with no
   *  trailing safety margin, so the last fraction of a second held back by
   *  every earlier pass (see the class-level comment) actually gets
   *  scheduled instead of silently never being played. Without this, the
   *  very end of every reply would be a fraction of a second short. */
  finish(): void {
    this.streamEnded = true;
    void this.scheduleDecode();
  }

  /** Instantaneous 0..1 amplitude estimate. Safe to call every animation frame. */
  read(): number {
    this.analyser.getByteTimeDomainData(this.data);
    let sumSquares = 0;
    for (const sample of this.data) {
      const normalized = (sample - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.data.length);
    if (rms <= NOISE_GATE) return 0;
    const normalized = Math.min(1, (rms - NOISE_GATE) / (PEAK_RMS - NOISE_GATE));
    // A straight linear map left quiet-to-moderate speech (most of any
    // given sentence -- only occasional syllables actually hit peak
    // loudness) mapping to a barely-open mouth, since most real RMS
    // values sit well below PEAK_RMS and a linear scale keeps them
    // proportionally small. Square-rooting boosts that whole low-to-mid
    // range up disproportionately (sqrt(0.16) = 0.4, i.e. 16% of peak
    // loudness already reads as 40% open) while leaving the two ends
    // where it matters least alone (0 stays 0, full loudness still
    // reaches fully open) -- a standard perceptual/gamma-style curve for
    // exactly this "make quiet inputs visibly register" problem.
    return Math.sqrt(normalized);
  }

  /** Discards anything buffered/scheduled -- used on barge-in (a new reply
   *  starts before the previous one finished speaking). */
  stop(): void {
    this.generation++;
    this.chunks = [];
    this.totalBytes = 0;
    this.playedDuration = 0;
    this.nextStartTime = 0;
    this.pendingRedecode = false;
    this.streamEnded = false;
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* already stopped/ended */
      }
    }
    this.activeSources = [];
  }
}
