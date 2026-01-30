import { offlineService } from "./offline-service";
import { v4 as uuidv4 } from "uuid";

export interface ChecklistItem {
  id: string;
  categoryId: string;
  questionId: string;
  questionTextEn: string;
  questionTextFr: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE";
  notes: string;
  evidenceIds: string[];
  completedAt?: number;
  completedById?: string;
}

export interface OfflineChecklist {
  id: string;
  reviewId: string;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface CapturedEvidence {
  id: string;
  checklistId: string;
  itemId: string;
  type: "PHOTO" | "VIDEO" | "AUDIO" | "NOTE";
  dataUrl: string; // Base64 for photos
  fileName: string;
  mimeType: string;
  size: number;
  metadata: {
    capturedAt: number;
    latitude?: number;
    longitude?: number;
    deviceInfo?: string;
  };
}

export class OfflineChecklistService {
  /**
   * Initialize checklist for a review (download for offline use)
   */
  async initializeChecklist(
    reviewId: string,
    items: ChecklistItem[]
  ): Promise<OfflineChecklist> {
    const existing = await this.getChecklist(reviewId);
    if (existing) return existing;

    const checklist: OfflineChecklist = {
      id: uuidv4(),
      reviewId,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await offlineService.put("checklists", {
      id: checklist.id,
      reviewId,
      data: checklist,
      syncedAt: Date.now(),
    } as { id: string; reviewId?: string });

    return checklist;
  }

  /**
   * Get checklist for a review
   */
  async getChecklist(reviewId: string): Promise<OfflineChecklist | undefined> {
    const all = await offlineService.getAll<{
      id: string;
      reviewId: string;
      data: OfflineChecklist;
    }>("checklists");
    const found = all.find((c) => c.reviewId === reviewId);
    return found?.data;
  }

  /**
   * Update checklist item
   */
  async updateItem(
    reviewId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ): Promise<void> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) throw new Error("Checklist not found");

    const itemIndex = checklist.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) throw new Error("Item not found");

    checklist.items[itemIndex] = { ...checklist.items[itemIndex], ...updates };
    checklist.updatedAt = Date.now();

    await offlineService.put("checklists", {
      id: checklist.id,
      reviewId,
      data: checklist,
      syncedAt: 0,
    } as { id: string; reviewId?: string });

    await offlineService.addToSyncQueue(
      "UPDATE",
      "checklist",
      checklist.id,
      checklist
    );
  }

  /**
   * Mark item as complete
   */
  async completeItem(
    reviewId: string,
    itemId: string,
    userId: string
  ): Promise<void> {
    await this.updateItem(reviewId, itemId, {
      status: "COMPLETED",
      completedAt: Date.now(),
      completedById: userId,
    });
  }

  /**
   * Add evidence to item
   */
  async addEvidence(
    reviewId: string,
    itemId: string,
    evidence: Omit<CapturedEvidence, "id" | "checklistId" | "itemId">
  ): Promise<string> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) throw new Error("Checklist not found");

    const evidenceId = uuidv4();
    const fullEvidence: CapturedEvidence = {
      ...evidence,
      id: evidenceId,
      checklistId: checklist.id,
      itemId,
    };

    // Store evidence separately (could be large)
    await offlineService.setMeta(`evidence-${evidenceId}`, fullEvidence);

    // Update item with evidence reference
    const item = checklist.items.find((i) => i.id === itemId);
    if (item) {
      await this.updateItem(reviewId, itemId, {
        evidenceIds: [...item.evidenceIds, evidenceId],
      });
    }

    return evidenceId;
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(evidenceId: string): Promise<CapturedEvidence | undefined> {
    return offlineService.getMeta<CapturedEvidence>(`evidence-${evidenceId}`);
  }

  /**
   * Get all evidence for an item
   */
  async getItemEvidence(
    reviewId: string,
    itemId: string
  ): Promise<CapturedEvidence[]> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) return [];

    const item = checklist.items.find((i) => i.id === itemId);
    if (!item) return [];

    const evidence: CapturedEvidence[] = [];
    for (const evidenceId of item.evidenceIds) {
      const e = await this.getEvidence(evidenceId);
      if (e) evidence.push(e);
    }

    return evidence;
  }

  /**
   * Remove evidence from item
   */
  async removeEvidence(
    reviewId: string,
    itemId: string,
    evidenceId: string
  ): Promise<void> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) throw new Error("Checklist not found");

    const item = checklist.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");

    // Remove evidence from item
    await this.updateItem(reviewId, itemId, {
      evidenceIds: item.evidenceIds.filter((id) => id !== evidenceId),
    });

    // Delete the evidence data
    await offlineService.deleteMeta(`evidence-${evidenceId}`);
  }

  /**
   * Get checklist progress
   */
  async getProgress(
    reviewId: string
  ): Promise<{ total: number; completed: number; percentage: number }> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) return { total: 0, completed: 0, percentage: 0 };

    const total = checklist.items.filter(
      (i) => i.status !== "NOT_APPLICABLE"
    ).length;
    const completed = checklist.items.filter(
      (i) => i.status === "COMPLETED"
    ).length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Get items by status
   */
  async getItemsByStatus(
    reviewId: string,
    status: ChecklistItem["status"]
  ): Promise<ChecklistItem[]> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) return [];

    return checklist.items.filter((i) => i.status === status);
  }

  /**
   * Reset checklist (clear all progress)
   */
  async resetChecklist(reviewId: string): Promise<void> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) throw new Error("Checklist not found");

    // Reset all items
    checklist.items = checklist.items.map((item) => ({
      ...item,
      status: "NOT_STARTED" as const,
      notes: "",
      evidenceIds: [],
      completedAt: undefined,
      completedById: undefined,
    }));
    checklist.updatedAt = Date.now();

    await offlineService.put("checklists", {
      id: checklist.id,
      reviewId,
      data: checklist,
      syncedAt: 0,
    } as { id: string; reviewId?: string });

    await offlineService.addToSyncQueue(
      "UPDATE",
      "checklist",
      checklist.id,
      checklist
    );
  }

  /**
   * Delete checklist
   */
  async deleteChecklist(reviewId: string): Promise<void> {
    const checklist = await this.getChecklist(reviewId);
    if (!checklist) return;

    // Delete all evidence
    for (const item of checklist.items) {
      for (const evidenceId of item.evidenceIds) {
        await offlineService.deleteMeta(`evidence-${evidenceId}`);
      }
    }

    // Delete checklist
    await offlineService.delete("checklists", checklist.id);
  }
}

export const offlineChecklistService = new OfflineChecklistService();
