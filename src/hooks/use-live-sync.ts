"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePresence, type PresenceMember } from "./use-presence";
import {
  useLiveFindings,
  type FindingCreated,
  type FindingUpdate,
  type FindingDeleted,
} from "./use-live-findings";
import { toast } from "sonner";

interface LiveUpdate {
  id: string;
  type:
    | "finding_created"
    | "finding_updated"
    | "finding_deleted"
    | "member_joined"
    | "member_left";
  message: string;
  user: string;
  timestamp: Date;
}

interface UseLiveSyncOptions {
  reviewId: string;
  userId?: string; // Pass from server component - no need for SessionProvider
  showToasts?: boolean;
  onFindingsChange?: () => void; // Callback to refetch findings
}

interface UseLiveSyncReturn {
  // Presence
  members: PresenceMember[];
  isConnected: boolean;
  updateFocus: (focus: string) => void;

  // Activity feed
  recentUpdates: LiveUpdate[];
  clearUpdates: () => void;
}

export function useLiveSync({
  reviewId,
  userId,
  showToasts = true,
  onFindingsChange,
}: UseLiveSyncOptions): UseLiveSyncReturn {
  const [recentUpdates, setRecentUpdates] = useState<LiveUpdate[]>([]);
  const membersRef = useRef<PresenceMember[]>([]);

  const addUpdate = useCallback(
    (update: Omit<LiveUpdate, "id" | "timestamp">) => {
      const newUpdate: LiveUpdate = {
        ...update,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      setRecentUpdates((prev) => [newUpdate, ...prev].slice(0, 50)); // Keep last 50

      if (showToasts) {
        toast.info(update.message, {
          description: `by ${update.user}`,
          duration: 4000,
        });
      }
    },
    [showToasts]
  );

  // Presence callbacks
  const handleMemberJoined = useCallback(
    (member: PresenceMember) => {
      addUpdate({
        type: "member_joined",
        message: `${member.name} joined the session`,
        user: member.name,
      });
    },
    [addUpdate]
  );

  const handleMemberLeft = useCallback(
    (memberId: string) => {
      const member = membersRef.current.find((m) => m.id === memberId);
      if (member) {
        addUpdate({
          type: "member_left",
          message: `${member.name} left the session`,
          user: member.name,
        });
      }
    },
    [addUpdate]
  );

  // Presence - pass userId to avoid needing SessionProvider
  const { members, isConnected, updateFocus } = usePresence({
    reviewId,
    userId,
    onMemberJoined: handleMemberJoined,
    onMemberLeft: handleMemberLeft,
  });

  // Keep membersRef in sync
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // Finding callbacks
  const handleFindingCreated = useCallback(
    (data: FindingCreated) => {
      addUpdate({
        type: "finding_created",
        message: `New finding: ${data.finding.referenceNumber}`,
        user: data.createdBy.name,
      });
      onFindingsChange?.();
    },
    [addUpdate, onFindingsChange]
  );

  const handleFindingUpdated = useCallback(
    (data: FindingUpdate) => {
      addUpdate({
        type: "finding_updated",
        message: `Finding updated`,
        user: data.updatedBy.name,
      });
      onFindingsChange?.();
    },
    [addUpdate, onFindingsChange]
  );

  const handleFindingDeleted = useCallback(
    (data: FindingDeleted) => {
      addUpdate({
        type: "finding_deleted",
        message: `Finding ${data.referenceNumber} deleted`,
        user: data.deletedBy.name,
      });
      onFindingsChange?.();
    },
    [addUpdate, onFindingsChange]
  );

  // Live findings
  useLiveFindings({
    reviewId,
    onFindingCreated: handleFindingCreated,
    onFindingUpdated: handleFindingUpdated,
    onFindingDeleted: handleFindingDeleted,
  });

  const clearUpdates = useCallback(() => {
    setRecentUpdates([]);
  }, []);

  return {
    members,
    isConnected,
    updateFocus,
    recentUpdates,
    clearUpdates,
  };
}
