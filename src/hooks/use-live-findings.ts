"use client";

import { useEffect, useRef, useState } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { Channel } from "pusher-js";

export interface FindingUpdate {
  findingId: string;
  changes: Record<string, unknown>;
  updatedBy: { id: string; name: string };
  timestamp: Date;
}

export interface FindingCreated {
  finding: {
    id: string;
    referenceNumber: string;
    title: string;
    severity: string;
    status: string;
  };
  createdBy: { id: string; name: string };
  timestamp: Date;
}

export interface FindingDeleted {
  findingId: string;
  referenceNumber: string;
  deletedBy: { id: string; name: string };
  timestamp: Date;
}

export interface CommentAdded {
  comment: {
    id: string;
    content: string;
    parentType: string;
    parentId: string;
    createdAt: Date;
  };
  addedBy: { id: string; name: string };
  timestamp: Date;
}

interface UseLiveFindingsOptions {
  reviewId: string;
  userId?: string; // Pass from server component - no need for SessionProvider
  onFindingCreated?: (data: FindingCreated) => void;
  onFindingUpdated?: (data: FindingUpdate) => void;
  onFindingDeleted?: (data: FindingDeleted) => void;
  onCommentAdded?: (data: CommentAdded) => void;
}

interface UseLiveFindingsReturn {
  isConnected: boolean;
}

export function useLiveFindings({
  reviewId,
  userId,
  onFindingCreated,
  onFindingUpdated,
  onFindingDeleted,
  onCommentAdded,
}: UseLiveFindingsOptions): UseLiveFindingsReturn {
  const channelRef = useRef<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId || !reviewId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.review(reviewId));
    channelRef.current = channel;

    // Connection state
    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    // Finding created
    channel.bind(EVENTS.FINDING_CREATED, (data: FindingCreated) => {
      // Don't notify if current user created it
      if (data.createdBy.id !== userId) {
        onFindingCreated?.(data);
      }
    });

    // Finding updated
    channel.bind(EVENTS.FINDING_UPDATED, (data: FindingUpdate) => {
      // Don't notify if current user updated it
      if (data.updatedBy.id !== userId) {
        onFindingUpdated?.(data);
      }
    });

    // Finding deleted
    channel.bind(EVENTS.FINDING_DELETED, (data: FindingDeleted) => {
      // Always notify, even if current user deleted
      onFindingDeleted?.(data);
    });

    // Comment added
    channel.bind(EVENTS.COMMENT_ADDED, (data: CommentAdded) => {
      if (data.addedBy?.id !== userId) {
        onCommentAdded?.(data);
      }
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.review(reviewId));
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [
    userId,
    reviewId,
    onFindingCreated,
    onFindingUpdated,
    onFindingDeleted,
    onCommentAdded,
  ]);

  return {
    isConnected,
  };
}
