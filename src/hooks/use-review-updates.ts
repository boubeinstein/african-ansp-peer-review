"use client";

import { useEffect, useRef } from "react";
import { getPusherClient, isPusherAvailable } from "@/lib/pusher/client";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface UseReviewUpdatesOptions {
  reviewId: string;
  userId?: string;
  enabled?: boolean;
}

interface FindingEventData {
  finding: {
    id: string;
    referenceNumber: string;
    titleEn?: string;
    severity?: string;
    status?: string;
  };
  createdBy?: { id: string; name: string };
  updatedBy?: { id: string; name: string };
  deletedBy?: { id: string; name: string };
  changes?: string[];
  timestamp: string;
}

interface FindingDeletedData {
  findingId: string;
  referenceNumber: string;
  deletedBy: { id: string; name: string };
  timestamp: string;
}

interface DiscussionEventData {
  discussion: {
    id: string;
    subject?: string;
    content?: string;
    parentId?: string | null;
    action?: string;
  };
  author: { id: string; name: string };
  timestamp: string;
}

interface TaskEventData {
  task: {
    id: string;
    title: string;
    status: string;
    priority?: string;
    assignee?: string | null;
  };
  changeType: "created" | "updated" | "completed" | "deleted";
  updatedBy: { id: string; name: string };
  timestamp: string;
}

interface SessionEventData {
  session: {
    id: string;
    type: string;
    title?: string | null;
    startedBy: { id: string; firstName: string; lastName: string };
  };
}

interface SessionEndedData {
  sessionId: string;
  endedAt: string;
}

/**
 * Hook that subscribes to Pusher events for a review and auto-invalidates
 * tRPC queries when other team members make changes.
 */
export function useReviewUpdates({
  reviewId,
  userId,
  enabled = true,
}: UseReviewUpdatesOptions) {
  const utils = trpc.useUtils();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getPusherClient>["subscribe"]
  > | null>(null);

  useEffect(() => {
    if (!enabled || !reviewId || !isPusherAvailable()) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.review(reviewId));
    channelRef.current = channel;

    // --- Finding events ---
    // Helper to invalidate notification queries (bell updates in real-time)
    const invalidateNotifications = () => {
      utils.notification.getRecent.invalidate();
      utils.notification.getUnreadCount.invalidate();
    };

    channel.bind(EVENTS.FINDING_CREATED, (data: FindingEventData) => {
      if (data.createdBy && data.createdBy.id !== userId) {
        toast.info(
          `${data.createdBy.name} created finding ${data.finding.referenceNumber}`
        );
      }
      utils.finding.list.invalidate();
      utils.finding.getStats.invalidate();
      utils.finding.getByReview.invalidate({ reviewId });
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    channel.bind(EVENTS.FINDING_UPDATED, (data: FindingEventData) => {
      if (data.updatedBy && data.updatedBy.id !== userId) {
        toast.info(
          `${data.updatedBy.name} updated finding ${data.finding.referenceNumber}`
        );
      }
      utils.finding.list.invalidate();
      utils.finding.getById.invalidate({ id: data.finding.id });
      utils.finding.getStats.invalidate();
      utils.finding.getByReview.invalidate({ reviewId });
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    channel.bind(EVENTS.FINDING_DELETED, (data: FindingDeletedData) => {
      if (data.deletedBy && data.deletedBy.id !== userId) {
        toast.info(
          `${data.deletedBy.name} deleted finding ${data.referenceNumber}`
        );
      }
      utils.finding.list.invalidate();
      utils.finding.getStats.invalidate();
      utils.finding.getByReview.invalidate({ reviewId });
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    // --- Discussion events ---
    channel.bind(EVENTS.COMMENT_ADDED, (data: DiscussionEventData) => {
      if (data.author.id !== userId) {
        const action = data.discussion.action;
        if (action === "resolved") {
          toast.info(`${data.author.name} resolved a discussion`);
        } else if (action === "reopened") {
          toast.info(`${data.author.name} reopened a discussion`);
        } else if (data.discussion.parentId) {
          toast.info(`${data.author.name} replied to a discussion`);
        } else {
          toast.info(`${data.author.name} started a new discussion`);
        }
      }
      utils.reviewDiscussion.list.invalidate();
      utils.reviewDiscussion.getStats.invalidate();
      if (data.discussion.id) {
        utils.reviewDiscussion.getById.invalidate({ id: data.discussion.id });
      }
      if (data.discussion.parentId) {
        utils.reviewDiscussion.getById.invalidate({
          id: data.discussion.parentId,
        });
      }
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    // --- Task events ---
    channel.bind(EVENTS.TASK_UPDATED, (data: TaskEventData) => {
      if (data.updatedBy.id !== userId) {
        switch (data.changeType) {
          case "created":
            toast.info(
              `${data.updatedBy.name} created task "${data.task.title}"`
            );
            break;
          case "completed":
            toast.info(
              `${data.updatedBy.name} completed task "${data.task.title}"`
            );
            break;
          case "deleted":
            toast.info(`${data.updatedBy.name} deleted a task`);
            break;
          default:
            toast.info(
              `${data.updatedBy.name} updated task "${data.task.title}"`
            );
        }
      }
      utils.reviewTask.list.invalidate();
      utils.reviewTask.getStats.invalidate();
      if (data.task.id && data.changeType !== "deleted") {
        utils.reviewTask.getById.invalidate({ id: data.task.id });
      }
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    // --- Session events ---
    channel.bind(EVENTS.SESSION_STARTED, (data: SessionEventData) => {
      const starter = data.session.startedBy;
      const starterId = starter.id;
      if (starterId !== userId) {
        toast.info(
          `${starter.firstName} ${starter.lastName} started a collaboration session`
        );
      }
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getActiveSessionCount.invalidate();
      utils.collaboration.getMyActiveSessions.invalidate();
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
      invalidateNotifications();
    });

    channel.bind(EVENTS.SESSION_ENDED, (data: SessionEndedData) => {
      void data;
      utils.collaboration.getActiveSession.invalidate({ reviewId });
      utils.collaboration.getActiveSessionCount.invalidate();
      utils.collaboration.getMyActiveSessions.invalidate();
      utils.collaboration.getRecentActivity.invalidate({ reviewId });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.review(reviewId));
      channelRef.current = null;
    };
  }, [reviewId, userId, enabled, utils]);
}
