// =============================================================================
// Media Capture — camera, gallery, image compression, GPS
// =============================================================================

const DEFAULT_QUALITY = 0.8;
const MAX_CAPTURE_WIDTH = 1920;
const THUMBNAIL_WIDTH = 200;
const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB
const GPS_TIMEOUT_MS = 10_000;

// =============================================================================
// Return types
// =============================================================================

export interface CapturedImage {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
}

// =============================================================================
// capturePhoto — open device camera, grab a frame
// =============================================================================

export async function capturePhoto(options?: {
  facing?: "user" | "environment";
  quality?: number;
}): Promise<CapturedImage> {
  const facing = options?.facing ?? "environment";
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: MAX_CAPTURE_WIDTH } },
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", "true"); // iOS requirement
    await video.play();

    // Wait one frame so dimensions are available
    await new Promise((r) => requestAnimationFrame(r));

    const width = video.videoWidth;
    const height = video.videoHeight;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const thumbnail = await generateThumbnail(blob, THUMBNAIL_WIDTH);

    return { blob, thumbnail, width, height };
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}

// =============================================================================
// selectFromGallery — file picker for images
// =============================================================================

export function selectFromGallery(): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      try {
        let imageBlob: Blob = file;

        // Compress large files
        if (file.size > COMPRESS_THRESHOLD_BYTES) {
          imageBlob = await compressImage(file, MAX_CAPTURE_WIDTH, DEFAULT_QUALITY);
        }

        const dims = await getImageDimensions(imageBlob);
        const thumbnail = await generateThumbnail(imageBlob, THUMBNAIL_WIDTH);

        resolve({ blob: imageBlob, thumbnail, ...dims });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to process image"));
      }
    };

    // Handle cancel (user closes dialog without selecting)
    input.oncancel = () => reject(new Error("Selection cancelled"));

    input.click();
  });
}

// =============================================================================
// compressImage — resize + JPEG compress via canvas
// =============================================================================

export async function compressImage(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const { width: origW, height: origH } = bitmap;

  let w = origW;
  let h = origH;
  if (w > maxWidth) {
    const ratio = maxWidth / w;
    w = maxWidth;
    h = Math.round(h * ratio);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

// =============================================================================
// generateThumbnail
// =============================================================================

export async function generateThumbnail(
  blob: Blob,
  maxWidth: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(maxWidth / bitmap.width, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.6 });
}

// =============================================================================
// getCurrentPosition — GPS
// =============================================================================

export async function getCurrentPosition(): Promise<GeoPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 60_000,
      });
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      timestamp: pos.timestamp,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Internal helpers
// =============================================================================

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality
    );
  });
}

async function getImageDimensions(
  blob: Blob
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}
