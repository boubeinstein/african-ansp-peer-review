"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => void;
  error: Error | null;
}

/**
 * A hook for auto-saving data with debouncing
 *
 * @param options - Configuration options
 * @param options.data - The data to save
 * @param options.onSave - Async function to save the data
 * @param options.debounceMs - Debounce delay in milliseconds (default: 2000)
 * @param options.enabled - Whether auto-save is enabled (default: true)
 * @returns Save status and controls
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);
  const pendingSaveRef = useRef(false);

  // Deep comparison of data
  const hasDataChanged = useCallback((newData: T, oldData: T): boolean => {
    return JSON.stringify(newData) !== JSON.stringify(oldData);
  }, []);

  // Perform the save operation
  const performSave = useCallback(async (dataToSave: T) => {
    if (!isMountedRef.current) return;

    setSaveStatus("saving");
    setError(null);

    try {
      await onSave(dataToSave);
      if (isMountedRef.current) {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        lastDataRef.current = dataToSave;

        // Reset status to idle after a delay
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus("idle");
          }
        }, 2000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSaveStatus("error");
        setError(err instanceof Error ? err : new Error("Save failed"));
      }
    }
  }, [onSave]);

  // Manual save trigger
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    performSave(lastDataRef.current);
  }, [performSave]);

  // Effect to handle debounced auto-save
  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    if (!hasDataChanged(data, lastDataRef.current)) {
      return;
    }

    // Update the ref to track latest data
    lastDataRef.current = data;
    pendingSaveRef.current = true;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        performSave(data);
        pendingSaveRef.current = false;
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled, hasDataChanged, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save on page unload if there are pending changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current && enabled) {
        e.preventDefault();
        e.returnValue = "";
        // Attempt to save synchronously (may not complete)
        performSave(lastDataRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, performSave]);

  return {
    saveStatus,
    lastSavedAt,
    saveNow,
    error,
  };
}

/**
 * A simpler hook for debouncing a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook for tracking dirty state of a form
 */
export function useDirtyTracking<T>(
  currentData: T,
  savedData: T
): {
  isDirty: boolean;
  changedFields: string[];
} {
  const isDirty = JSON.stringify(currentData) !== JSON.stringify(savedData);

  // Find which fields have changed (for objects)
  const changedFields: string[] = [];
  if (typeof currentData === "object" && currentData !== null) {
    const current = currentData as Record<string, unknown>;
    const saved = savedData as Record<string, unknown>;

    for (const key of Object.keys(current)) {
      if (JSON.stringify(current[key]) !== JSON.stringify(saved[key])) {
        changedFields.push(key);
      }
    }
  }

  return { isDirty, changedFields };
}
