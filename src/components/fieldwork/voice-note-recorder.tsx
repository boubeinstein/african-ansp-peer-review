"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mic,
  Square,
  Pause,
  Play,
  Save,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AudioRecorder,
  createAudioRecorder,
  formatDuration,
  type AudioRecorderResult,
} from "@/lib/offline/audio-recorder";
import { getCurrentPosition } from "@/lib/offline/media-capture";
import { FieldEvidenceType } from "@/lib/offline/types";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";

// =============================================================================
// Constants
// =============================================================================

const MAX_DURATION_S = 300; // 5 minutes
const WARNING_S = 270; // 4:30 warning
const WAVEFORM_BARS = 5;
const WAVEFORM_INTERVAL_MS = 100;

// =============================================================================
// Props
// =============================================================================

interface VoiceNoteRecorderProps {
  checklistItemId: string;
  reviewId: string;
  onSave?: (evidenceId: string) => void;
}

// =============================================================================
// State machine
// =============================================================================

type RecorderState = "idle" | "recording" | "paused" | "preview";

// =============================================================================
// Component
// =============================================================================

export function VoiceNoteRecorder({
  checklistItemId,
  reviewId,
  onSave,
}: VoiceNoteRecorderProps) {
  const t = useTranslations("fieldwork.checklist");
  const addEvidence = useOfflineFieldworkStore((s) => s.addEvidence);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const waveformTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(WAVEFORM_BARS).fill(0));
  const [result, setResult] = useState<AudioRecorderResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warned, setWarned] = useState(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (recorderRef.current?.isRecording) {
        void recorderRef.current.stop().catch(() => {});
      }
      if (waveformTimerRef.current) clearInterval(waveformTimerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-stop at max duration
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (state !== "recording" && state !== "paused") return;

    if (duration >= MAX_DURATION_S) {
      void handleStop();
    } else if (duration >= WARNING_S && !warned) {
      setWarned(true);
      vibrate();
      toast.warning(
        t("evidence") + `: ${formatDuration(MAX_DURATION_S - duration)} remaining`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, state]);

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    try {
      const recorder = createAudioRecorder();
      recorderRef.current = recorder;

      await recorder.start();
      setState("recording");
      setDuration(0);
      setWarned(false);

      // Duration updates
      recorder.onDurationUpdate((secs) => setDuration(secs));

      // Waveform polling
      waveformTimerRef.current = setInterval(() => {
        const data = recorder.getVisualizerData();
        if (data) {
          // Sample evenly from frequency data to get WAVEFORM_BARS values
          const step = Math.max(1, Math.floor(data.length / WAVEFORM_BARS));
          const newBars: number[] = [];
          for (let i = 0; i < WAVEFORM_BARS; i++) {
            newBars.push((data[i * step] ?? 0) / 255); // normalise to 0..1
          }
          setBars(newBars);
        }
      }, WAVEFORM_INTERVAL_MS);

      vibrate();
    } catch {
      toast.error(t("evidenceFailed"));
    }
  }, [t]);

  // ---------------------------------------------------------------------------
  // Stop recording → preview
  // ---------------------------------------------------------------------------

  const handleStop = useCallback(async () => {
    if (waveformTimerRef.current) {
      clearInterval(waveformTimerRef.current);
      waveformTimerRef.current = null;
    }
    setBars(Array(WAVEFORM_BARS).fill(0));

    const recorder = recorderRef.current;
    if (!recorder?.isRecording) return;

    try {
      const res = await recorder.stop();
      setResult(res);
      setPreviewUrl(URL.createObjectURL(res.blob));
      setState("preview");
    } catch {
      setState("idle");
      toast.error(t("evidenceFailed"));
    }
  }, [t]);

  // ---------------------------------------------------------------------------
  // Pause / Resume
  // ---------------------------------------------------------------------------

  function handlePause() {
    recorderRef.current?.pause();
    setState("paused");
    vibrate();
  }

  function handleResume() {
    recorderRef.current?.resume();
    setState("recording");
    vibrate();
  }

  // ---------------------------------------------------------------------------
  // Preview playback
  // ---------------------------------------------------------------------------

  function togglePlayback() {
    if (!previewUrl) return;

    if (isPlaying && audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(previewUrl);
    audioElRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }

  // ---------------------------------------------------------------------------
  // Save to store
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!result) return;
    setSaving(true);

    try {
      const gps = await getCurrentPosition();

      await addEvidence(checklistItemId, {
        checklistItemId,
        reviewId,
        type: FieldEvidenceType.VOICE_NOTE,
        blob: result.blob,
        thumbnailBlob: null,
        mimeType: result.mimeType,
        fileName: `voice_${Date.now()}.${extensionFromMime(result.mimeType)}`,
        fileSize: result.blob.size,
        gpsLatitude: gps?.latitude ?? null,
        gpsLongitude: gps?.longitude ?? null,
        gpsAccuracy: gps?.accuracy ?? null,
        capturedAt: new Date(),
        annotations: formatDuration(result.duration),
      });

      toast.success(t("evidenceCaptured"));
      onSave?.(checklistItemId);
    } catch {
      toast.error(t("evidenceFailed"));
    } finally {
      handleDiscard();
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Discard
  // ---------------------------------------------------------------------------

  function handleDiscard() {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setResult(null);
    setPreviewUrl(null);
    setIsPlaying(false);
    setState("idle");
    setDuration(0);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // IDLE
  if (state === "idle") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="min-h-[44px] min-w-[44px]"
        onClick={handleStart}
      >
        <Mic className="h-4 w-4 mr-1.5" />
        {t("evidence")}
      </Button>
    );
  }

  // RECORDING / PAUSED
  if (state === "recording" || state === "paused") {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-2.5">
        {/* Pulsing red dot */}
        <span
          className={cn(
            "h-3 w-3 rounded-full shrink-0",
            state === "recording"
              ? "bg-red-500 animate-pulse"
              : "bg-amber-400"
          )}
        />

        {/* Duration */}
        <span className="text-sm font-mono tabular-nums min-w-[48px]">
          {formatDuration(duration)}
        </span>

        {/* Waveform bars */}
        <div className="flex items-end gap-0.5 h-5">
          {bars.map((level, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-100",
                state === "recording" ? "bg-red-500" : "bg-amber-400"
              )}
              style={{ height: `${Math.max(4, level * 20)}px` }}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Pause / Resume */}
        {state === "recording" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handlePause}
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleResume}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {/* Stop */}
        <Button
          variant="destructive"
          size="icon"
          className="h-9 w-9"
          onClick={handleStop}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // PREVIEW
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={togglePlayback}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Duration */}
      <span className="text-sm font-mono tabular-nums">
        {formatDuration(result?.duration ?? 0)}
      </span>

      <div className="flex-1" />

      {/* Save */}
      <Button
        size="sm"
        className="min-h-[44px]"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Save className="h-4 w-4 mr-1.5" />
        )}
        {t("evidence")}
      </Button>

      {/* Discard */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        onClick={handleDiscard}
        disabled={saving}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function extensionFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "audio";
}
