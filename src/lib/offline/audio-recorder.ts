// =============================================================================
// Audio Recorder — MediaRecorder-based voice note capture
// =============================================================================

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

const TIMESLICE_MS = 250; // collect data every 250 ms for responsive stop
const DURATION_INTERVAL_MS = 100;
const ANALYSER_FFT_SIZE = 64; // small FFT → few frequency bins → simple bars

// =============================================================================
// Types
// =============================================================================

export interface AudioRecorderResult {
  blob: Blob;
  duration: number; // seconds
  mimeType: string;
}

type DurationCallback = (seconds: number) => void;

// =============================================================================
// AudioRecorder class
// =============================================================================

export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private pausedDuration = 0;
  private pauseStart = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private durationCallbacks = new Set<DurationCallback>();

  // Audio analysis for waveform visualisation
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  isRecording = false;
  isPaused = false;
  duration = 0; // current elapsed seconds

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.isRecording) return;

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedMimeType();

    this.recorder = new MediaRecorder(this.stream, {
      mimeType,
    });

    this.chunks = [];

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    // Set up analyser for waveform data
    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = ANALYSER_FFT_SIZE;
    source.connect(this.analyser);

    this.recorder.start(TIMESLICE_MS);
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedDuration = 0;
    this.duration = 0;

    this.startDurationTimer();
  }

  // ---------------------------------------------------------------------------
  // Stop → returns result
  // ---------------------------------------------------------------------------

  stop(): Promise<AudioRecorderResult> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || !this.isRecording) {
        reject(new Error("Not recording"));
        return;
      }

      const mimeType = this.recorder.mimeType;

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        const duration = this.duration;

        this.cleanup();
        resolve({ blob, duration, mimeType });
      };

      this.recorder.onerror = () => {
        this.cleanup();
        reject(new Error("Recording failed"));
      };

      this.recorder.stop();
    });
  }

  // ---------------------------------------------------------------------------
  // Pause / Resume
  // ---------------------------------------------------------------------------

  pause(): void {
    if (!this.recorder || !this.isRecording || this.isPaused) return;
    this.recorder.pause();
    this.isPaused = true;
    this.pauseStart = Date.now();
  }

  resume(): void {
    if (!this.recorder || !this.isRecording || !this.isPaused) return;
    this.recorder.resume();
    this.isPaused = false;
    this.pausedDuration += Date.now() - this.pauseStart;
  }

  // ---------------------------------------------------------------------------
  // Duration callback
  // ---------------------------------------------------------------------------

  onDurationUpdate(callback: DurationCallback): () => void {
    this.durationCallbacks.add(callback);
    return () => this.durationCallbacks.delete(callback);
  }

  // ---------------------------------------------------------------------------
  // Waveform data for visualisation
  // ---------------------------------------------------------------------------

  getVisualizerData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private startDurationTimer(): void {
    this.durationTimer = setInterval(() => {
      if (!this.isPaused) {
        this.duration =
          (Date.now() - this.startTime - this.pausedDuration) / 1000;
        for (const cb of this.durationCallbacks) {
          cb(this.duration);
        }
      }
    }, DURATION_INTERVAL_MS);
  }

  private cleanup(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
      this.analyser = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.duration = 0;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createAudioRecorder(): AudioRecorder {
  return new AudioRecorder();
}

// =============================================================================
// Helpers
// =============================================================================

function getSupportedMimeType(): string {
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Fallback — let the browser choose
  return "";
}

/**
 * Format seconds as MM:SS for display.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
