import { create } from "zustand";
import { offlineService } from "./offline-service";

interface OfflineState {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  lastSyncTime: number | null;

  // Actions
  setOnline: (online: boolean) => void;
  updatePendingCount: () => Promise<void>;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingSyncCount: 0,
  isSyncing: false,
  lastSyncError: null,
  lastSyncTime: null,

  setOnline: (online) => set({ isOnline: online }),

  updatePendingCount: async () => {
    try {
      const count = await offlineService.getSyncQueueCount();
      set({ pendingSyncCount: count });
    } catch {
      // IndexedDB not available
    }
  },

  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setSyncError: (error) => set({ lastSyncError: error }),

  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}));

// Initialize online status listener
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useOfflineStore.getState().setOnline(true);
  });

  window.addEventListener("offline", () => {
    useOfflineStore.getState().setOnline(false);
  });
}
