import { openDB, DBSchema, IDBPDatabase } from "idb";

interface AAProfflineDB extends DBSchema {
  reviews: {
    key: string;
    value: {
      id: string;
      data: unknown;
      syncedAt: number;
      version: number;
    };
    indexes: { "by-synced": number };
  };
  findings: {
    key: string;
    value: {
      id: string;
      data: unknown;
      syncedAt: number;
      version: number;
    };
    indexes: { "by-synced": number };
  };
  caps: {
    key: string;
    value: {
      id: string;
      data: unknown;
      syncedAt: number;
      version: number;
    };
    indexes: { "by-synced": number };
  };
  checklists: {
    key: string;
    value: {
      id: string;
      reviewId: string;
      data: unknown;
      syncedAt: number;
    };
    indexes: { "by-review": string };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: "CREATE" | "UPDATE" | "DELETE";
      entityType: string;
      entityId: string;
      data: unknown;
      createdAt: number;
      attempts: number;
      lastError?: string;
    };
    indexes: { "by-created": number; "by-entity": [string, string] };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
}

const DB_NAME = "aaprp-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AAProfflineDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<AAProfflineDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in browser");
  }

  if (!dbPromise) {
    dbPromise = openDB<AAProfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Reviews store
        if (!db.objectStoreNames.contains("reviews")) {
          const reviewStore = db.createObjectStore("reviews", { keyPath: "id" });
          reviewStore.createIndex("by-synced", "syncedAt");
        }

        // Findings store
        if (!db.objectStoreNames.contains("findings")) {
          const findingStore = db.createObjectStore("findings", {
            keyPath: "id",
          });
          findingStore.createIndex("by-synced", "syncedAt");
        }

        // CAPs store
        if (!db.objectStoreNames.contains("caps")) {
          const capStore = db.createObjectStore("caps", { keyPath: "id" });
          capStore.createIndex("by-synced", "syncedAt");
        }

        // Checklists store
        if (!db.objectStoreNames.contains("checklists")) {
          const checklistStore = db.createObjectStore("checklists", {
            keyPath: "id",
          });
          checklistStore.createIndex("by-review", "reviewId");
        }

        // Sync queue
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
          syncStore.createIndex("by-created", "createdAt");
          syncStore.createIndex("by-entity", ["entityType", "entityId"]);
        }

        // Metadata
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
      },
    });
  }

  return dbPromise;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["reviews", "findings", "caps", "checklists", "syncQueue", "metadata"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("reviews").clear(),
    tx.objectStore("findings").clear(),
    tx.objectStore("caps").clear(),
    tx.objectStore("checklists").clear(),
    tx.objectStore("syncQueue").clear(),
    tx.objectStore("metadata").clear(),
  ]);
  await tx.done;
}

export type { AAProfflineDB };
