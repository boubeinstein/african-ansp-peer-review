"use client";

import { useCallback, useRef, useState } from "react";

interface PhotoMetadata {
  capturedAt: number;
  latitude?: number;
  longitude?: number;
  deviceInfo: string;
}

interface CaptureResult {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  metadata: PhotoMetadata;
}

interface UsePhotoCaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  includeGeolocation?: boolean;
}

export function usePhotoCapture(options: UsePhotoCaptureOptions = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    includeGeolocation = true,
  } = options;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compressImage = useCallback(
    async (dataUrl: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
      });
    },
    [maxWidth, maxHeight, quality]
  );

  const capturePhoto = useCallback((): Promise<CaptureResult> => {
    return new Promise((resolve, reject) => {
      setError(null);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment"; // Use back camera

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          const err = new Error("No file selected");
          setError(err);
          reject(err);
          return;
        }

        setIsCapturing(true);

        try {
          // Read file as data URL
          const originalDataUrl = await readFileAsDataUrl(file);

          // Compress image if needed
          const dataUrl = await compressImage(originalDataUrl);

          // Calculate compressed size
          const base64Length = dataUrl.split(",")[1]?.length || 0;
          const compressedSize = Math.round((base64Length * 3) / 4);

          // Get geolocation if available and requested
          let latitude: number | undefined;
          let longitude: number | undefined;

          if (includeGeolocation) {
            try {
              const position = await getCurrentPosition();
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
            } catch {
              // Geolocation not available or denied - continue without it
            }
          }

          const result: CaptureResult = {
            dataUrl,
            fileName: file.name || `photo_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
            size: compressedSize,
            metadata: {
              capturedAt: Date.now(),
              latitude,
              longitude,
              deviceInfo: navigator.userAgent,
            },
          };

          resolve(result);
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error("Failed to capture photo");
          setError(error);
          reject(error);
        } finally {
          setIsCapturing(false);
        }
      };

      // Handle cancel
      input.oncancel = () => {
        const err = new Error("Capture cancelled");
        setError(err);
        reject(err);
      };

      input.click();
    });
  }, [compressImage, includeGeolocation]);

  const selectFromGallery = useCallback((): Promise<CaptureResult> => {
    return new Promise((resolve, reject) => {
      setError(null);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      // Don't set capture to allow gallery selection

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          const err = new Error("No file selected");
          setError(err);
          reject(err);
          return;
        }

        setIsCapturing(true);

        try {
          const originalDataUrl = await readFileAsDataUrl(file);
          const dataUrl = await compressImage(originalDataUrl);

          const base64Length = dataUrl.split(",")[1]?.length || 0;
          const compressedSize = Math.round((base64Length * 3) / 4);

          const result: CaptureResult = {
            dataUrl,
            fileName: file.name || `photo_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
            size: compressedSize,
            metadata: {
              capturedAt: Date.now(),
              deviceInfo: navigator.userAgent,
            },
          };

          resolve(result);
        } catch (err) {
          const error =
            err instanceof Error
              ? err
              : new Error("Failed to process image");
          setError(error);
          reject(error);
        } finally {
          setIsCapturing(false);
        }
      };

      input.oncancel = () => {
        const err = new Error("Selection cancelled");
        setError(err);
        reject(err);
      };

      input.click();
    });
  }, [compressImage]);

  return {
    capturePhoto,
    selectFromGallery,
    isCapturing,
    error,
    inputRef,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}
