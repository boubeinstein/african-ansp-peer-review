import { getDB } from "./db";

type EntityType = "reviews" | "findings" | "caps" | "checklists";
type SyncAction = "CREATE" | "UPDATE" | "DELETE";

// Generate a simple unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export interface SyncQueueItem {
  id: string;
  action: SyncAction;
  entityType: string;
  entityId: string;
  data: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export class OfflineService {
  // === Generic Entity Operations ===

  async get<T>(store: EntityType, id: string): Promise<T | undefined> {
    const db = await getDB();
    const record = await db.get(store, id);
    return record?.data as T | undefined;
  }

  async getAll<T>(store: EntityType): Promise<T[]> {
    const db = await getDB();
    const records = await db.getAll(store);
    return records.map((r) => r.data as T);
  }

  async put<T extends { id: string }>(
    store: EntityType,
    data: T,
    synced: boolean = false
  ): Promise<void> {
    const db = await getDB();
    if (store === "checklists") {
      // Checklists have a different structure
      await db.put("checklists", {
        id: data.id,
        reviewId: (data as unknown as { reviewId: string }).reviewId || "",
        data,
        syncedAt: synced ? Date.now() : 0,
      });
    } else {
      await db.put(store, {
        id: data.id,
        data,
        syncedAt: synced ? Date.now() : 0,
        version: Date.now(),
      });
    }
  }

  async delete(store: EntityType, id: string): Promise<void> {
    const db = await getDB();
    await db.delete(store, id);
  }

  async bulkPut<T extends { id: string }>(
    store: EntityType,
    items: T[]
  ): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(store, "readwrite");
    await Promise.all(
      items.map((item) => {
        if (store === "checklists") {
          return tx.store.put({
            id: item.id,
            reviewId: (item as unknown as { reviewId: string }).reviewId || "",
            data: item,
            syncedAt: Date.now(),
          });
        }
        return tx.store.put({
          id: item.id,
          data: item,
          syncedAt: Date.now(),
          version: Date.now(),
        });
      })
    );
    await tx.done;
  }

  // === Sync Queue Operations ===

  async addToSyncQueue(
    action: SyncAction,
    entityType: string,
    entityId: string,
    data?: unknown
  ): Promise<string> {
    const db = await getDB();
    const id = generateId();
    await db.put("syncQueue", {
      id,
      action,
      entityType,
      entityId,
      data,
      createdAt: Date.now(),
      attempts: 0,
    });
    return id;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAllFromIndex("syncQueue", "by-created");
  }

  async getSyncQueueCount(): Promise<number> {
    const db = await getDB();
    return db.count("syncQueue");
  }

  async removeSyncItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("syncQueue", id);
  }

  async updateSyncItemError(id: string, error: string): Promise<void> {
    const db = await getDB();
    const item = await db.get("syncQueue", id);
    if (item) {
      item.attempts++;
      item.lastError = error;
      await db.put("syncQueue", item);
    }
  }

  async clearSyncQueue(): Promise<void> {
    const db = await getDB();
    await db.clear("syncQueue");
  }

  // === Metadata Operations ===

  async getMeta<T>(key: string): Promise<T | undefined> {
    const db = await getDB();
    const record = await db.get("metadata", key);
    return record?.value as T | undefined;
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    const db = await getDB();
    await db.put("metadata", { key, value, updatedAt: Date.now() });
  }

  async deleteMeta(key: string): Promise<void> {
    const db = await getDB();
    await db.delete("metadata", key);
  }

  // === Sync Status ===

  async getLastSyncTime(store: EntityType): Promise<number | undefined> {
    return this.getMeta<number>(`${store}-last-sync`);
  }

  async setLastSyncTime(store: EntityType): Promise<void> {
    await this.setMeta(`${store}-last-sync`, Date.now());
  }

  async isDataStale(
    store: EntityType,
    maxAgeMs: number = 5 * 60 * 1000
  ): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(store);
    if (!lastSync) return true;
    return Date.now() - lastSync > maxAgeMs;
  }

  // === Checklist-specific Operations ===

  async getChecklistsByReview<T>(reviewId: string): Promise<T[]> {
    const db = await getDB();
    const records = await db.getAllFromIndex("checklists", "by-review", reviewId);
    return records.map((r) => r.data as T);
  }

  // === Utility Methods ===

  async hasUnsynced(
    store: Exclude<EntityType, "checklists">
  ): Promise<boolean> {
    const db = await getDB();
    const records = await db.getAllFromIndex(store, "by-synced", 0);
    return records.length > 0;
  }

  async getUnsyncedCount(
    store: Exclude<EntityType, "checklists">
  ): Promise<number> {
    const db = await getDB();
    const records = await db.getAllFromIndex(store, "by-synced", 0);
    return records.length;
  }
}

export const offlineService = new OfflineService();
