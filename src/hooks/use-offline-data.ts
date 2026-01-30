"use client";

import { useCallback, useEffect, useState } from "react";
import { offlineService } from "@/lib/offline/offline-service";
import { useOfflineStore } from "@/lib/offline/store";

type EntityStore = "reviews" | "findings" | "caps" | "checklists";

interface UseOfflineDataOptions<T> {
  store: EntityStore;
  id?: string;
  fetchFn?: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number; // Time in ms before data is considered stale
}

interface UseOfflineDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isStale: boolean;
  isFromCache: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for offline-first data loading with caching
 * Attempts to load from IndexedDB first, then fetches from server if online
 */
export function useOfflineData<T>({
  store,
  id,
  fetchFn,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isOnline } = useOfflineStore();

  const loadData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, try to load from IndexedDB cache
      let cachedData: T | undefined;
      if (id) {
        cachedData = await offlineService.get<T>(store, id);
      }

      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);

        // Check if data is stale
        const isDataStale = await offlineService.isDataStale(store, staleTime);
        setIsStale(isDataStale);

        // If not stale and we have data, we're done
        if (!isDataStale) {
          setIsLoading(false);
          return;
        }
      }

      // If online and we have a fetch function, get fresh data
      if (isOnline && fetchFn) {
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        setIsStale(false);

        // Cache the fresh data
        if (freshData && typeof freshData === "object" && "id" in freshData) {
          await offlineService.put(
            store,
            freshData as T & { id: string },
            true
          );
          await offlineService.setLastSyncTime(store);
        }
      } else if (!cachedData) {
        // No cached data and offline - set appropriate state
        setIsFromCache(false);
        setIsStale(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, id, store, staleTime, isOnline, fetchFn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && isStale && fetchFn) {
      loadData();
    }
  }, [isOnline, isStale, fetchFn, loadData]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    isStale,
    isFromCache,
    error,
    refetch,
  };
}

interface UseOfflineListOptions<T> {
  store: EntityStore;
  fetchFn?: () => Promise<T[]>;
  enabled?: boolean;
  staleTime?: number;
}

interface UseOfflineListResult<T> {
  data: T[];
  isLoading: boolean;
  isStale: boolean;
  isFromCache: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for offline-first list data loading with caching
 */
export function useOfflineList<T>({
  store,
  fetchFn,
  enabled = true,
  staleTime = 5 * 60 * 1000,
}: UseOfflineListOptions<T>): UseOfflineListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isOnline } = useOfflineStore();

  const loadData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, try to load from IndexedDB cache
      const cachedData = await offlineService.getAll<T>(store);

      if (cachedData.length > 0) {
        setData(cachedData);
        setIsFromCache(true);

        // Check if data is stale
        const isDataStale = await offlineService.isDataStale(store, staleTime);
        setIsStale(isDataStale);

        // If not stale and we have data, we're done
        if (!isDataStale) {
          setIsLoading(false);
          return;
        }
      }

      // If online and we have a fetch function, get fresh data
      if (isOnline && fetchFn) {
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        setIsStale(false);

        // Cache the fresh data
        const itemsWithId = freshData.filter(
          (item): item is T & { id: string } =>
            typeof item === "object" && item !== null && "id" in item
        );
        if (itemsWithId.length > 0) {
          await offlineService.bulkPut(store, itemsWithId);
          await offlineService.setLastSyncTime(store);
        }
      } else if (cachedData.length === 0) {
        // No cached data and offline
        setIsFromCache(false);
        setIsStale(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, store, staleTime, isOnline, fetchFn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && isStale && fetchFn) {
      loadData();
    }
  }, [isOnline, isStale, fetchFn, loadData]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    isStale,
    isFromCache,
    error,
    refetch,
  };
}

interface UseOfflineMutationOptions<TInput, TOutput> {
  store: EntityStore;
  entityType: string;
  mutationFn: (input: TInput) => Promise<TOutput>;
  onSuccess?: (data: TOutput) => void;
  onError?: (error: Error) => void;
}

interface UseOfflineMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput | undefined>;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for offline-capable mutations
 * If offline, queues the mutation for later sync
 */
export function useOfflineMutation<TInput extends { id?: string }, TOutput>({
  store,
  entityType,
  mutationFn,
  onSuccess,
  onError,
}: UseOfflineMutationOptions<TInput, TOutput>): UseOfflineMutationResult<
  TInput,
  TOutput
> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isOnline } = useOfflineStore();

  const mutateAsync = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setIsLoading(true);
      setError(null);

      try {
        if (isOnline) {
          // Online: execute mutation directly
          const result = await mutationFn(input);
          onSuccess?.(result);

          // Update local cache
          if (result && typeof result === "object" && "id" in result) {
            await offlineService.put(
              store,
              result as TOutput & { id: string },
              true
            );
          }

          return result;
        } else {
          // Offline: save locally and queue for sync
          const entityId = input.id || `temp-${Date.now()}`;
          const dataWithId = { ...input, id: entityId };

          // Save to local store
          await offlineService.put(store, dataWithId as { id: string }, false);

          // Add to sync queue
          const action = input.id ? "UPDATE" : "CREATE";
          await offlineService.addToSyncQueue(action, entityType, entityId, input);

          // Update pending count
          await useOfflineStore.getState().updatePendingCount();

          // Return the local data as if it succeeded
          const result = dataWithId as unknown as TOutput;
          onSuccess?.(result);
          return result;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline, mutationFn, store, entityType, onSuccess, onError]
  );

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput | undefined> => {
      try {
        return await mutateAsync(input);
      } catch {
        return undefined;
      }
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
  };
}
