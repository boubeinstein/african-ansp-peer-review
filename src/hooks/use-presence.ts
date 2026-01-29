"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient, isPusherAvailable } from "@/lib/pusher/client";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { Channel, PresenceChannel } from "pusher-js";

export interface PresenceMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
  isOnline: boolean;
  currentFocus?: string;
  cursorPosition?: { x: number; y: number };
  lastSeenAt: Date;
}

interface UsePresenceOptions {
  reviewId: string;
  userId?: string; // Pass from server component - no need for SessionProvider
  // Database participants as fallback when Pusher unavailable
  dbParticipants?: Array<{
    id: string;
    odId?: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  onMemberJoined?: (member: PresenceMember) => void;
  onMemberLeft?: (memberId: string) => void;
  onMemberUpdated?: (member: PresenceMember) => void;
}

interface UsePresenceReturn {
  members: PresenceMember[];
  myMemberId: string | null;
  isConnected: boolean;
  isPusherAvailable: boolean;
  updateFocus: (focus: string) => void;
  updateCursor: (position: { x: number; y: number }) => void;
  broadcastTyping: (isTyping: boolean) => void;
}

interface PusherMemberInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
}

interface PusherMembersData {
  myID: string;
  members: {
    each: (
      callback: (member: { id: string; info: PusherMemberInfo }) => void
    ) => void;
  };
}

// Generate a consistent color from user ID
function generateColor(userId: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Generate avatar initials
function generateAvatar(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function usePresence({
  reviewId,
  userId,
  dbParticipants,
  onMemberJoined,
  onMemberLeft,
  onMemberUpdated,
}: UsePresenceOptions): UsePresenceReturn {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const pusherAvailable = isPusherAvailable();

  const channelRef = useRef<PresenceChannel | null>(null);
  const privateChannelRef = useRef<Channel | null>(null);
  const membersRef = useRef<PresenceMember[]>([]);

  // Keep membersRef in sync
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // Convert database participants to PresenceMembers (fallback when Pusher unavailable)
  useEffect(() => {
    if (!pusherAvailable && dbParticipants && dbParticipants.length > 0) {
      const dbMembers: PresenceMember[] = dbParticipants.map((p) => ({
        id: p.user.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        email: p.user.email,
        role: "Participant",
        avatar: generateAvatar(p.user.firstName, p.user.lastName),
        color: generateColor(p.user.id),
        isOnline: true, // Assume online from DB
        lastSeenAt: new Date(),
      }));
      setMembers(dbMembers);
      setIsConnected(false); // Not real-time connected
    }
  }, [pusherAvailable, dbParticipants]);

  // Real-time Pusher presence (when available)
  useEffect(() => {
    if (!pusherAvailable || !userId || !reviewId) return;

    const pusher = getPusherClient();

    // Subscribe to presence channel
    const presenceChannel = pusher.subscribe(
      CHANNELS.reviewPresence(reviewId)
    ) as PresenceChannel;

    channelRef.current = presenceChannel;

    // Subscribe to private channel for direct updates
    const privateChannel = pusher.subscribe(CHANNELS.review(reviewId));
    privateChannelRef.current = privateChannel;

    // Handle subscription success
    presenceChannel.bind(
      "pusher:subscription_succeeded",
      (data: PusherMembersData) => {
        setIsConnected(true);
        setMyMemberId(data.myID);

        // Convert members object to array
        const memberList: PresenceMember[] = [];
        data.members.each(
          (member: { id: string; info: PusherMemberInfo }) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _infoId, ...infoRest } = member.info;
            memberList.push({
              id: member.id,
              ...infoRest,
              isOnline: true,
              lastSeenAt: new Date(),
            } as PresenceMember);
          }
        );

        setMembers(memberList);
      }
    );

    // Handle member added
    presenceChannel.bind(
      "pusher:member_added",
      (member: { id: string; info: PusherMemberInfo }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _infoId, ...infoRest } = member.info;
        const newMember: PresenceMember = {
          id: member.id,
          ...infoRest,
          isOnline: true,
          lastSeenAt: new Date(),
        } as PresenceMember;

        setMembers((prev) => [
          ...prev.filter((m) => m.id !== member.id),
          newMember,
        ]);
        onMemberJoined?.(newMember);
      }
    );

    // Handle member removed
    presenceChannel.bind(
      "pusher:member_removed",
      (member: { id: string; info: PusherMemberInfo }) => {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        onMemberLeft?.(member.id);
      }
    );

    // Handle member updates (focus, cursor)
    presenceChannel.bind(
      EVENTS.MEMBER_UPDATED,
      (
        data: { userId: string; updates?: Partial<PresenceMember> } & Partial<PresenceMember>
      ) => {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === data.userId
              ? { ...m, ...data.updates, ...data, lastSeenAt: new Date() }
              : m
          )
        );

        const updatedMember = membersRef.current.find(
          (m) => m.id === data.userId
        );
        if (updatedMember) {
          onMemberUpdated?.({ ...updatedMember, ...data.updates, ...data });
        }
      }
    );

    // Handle cursor movements
    presenceChannel.bind(
      EVENTS.CURSOR_MOVE,
      (data: { userId: string; position: { x: number; y: number } }) => {
        if (data.userId !== userId) {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === data.userId ? { ...m, cursorPosition: data.position } : m
            )
          );
        }
      }
    );

    // Cleanup
    return () => {
      presenceChannel.unbind_all();
      privateChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.reviewPresence(reviewId));
      pusher.unsubscribe(CHANNELS.review(reviewId));
      channelRef.current = null;
      privateChannelRef.current = null;
      setIsConnected(false);
    };
  }, [
    pusherAvailable,
    userId,
    reviewId,
    onMemberJoined,
    onMemberLeft,
    onMemberUpdated,
  ]);

  // Update focus (which element user is viewing/editing)
  const updateFocus = useCallback(
    (focus: string) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;

      channelRef.current.trigger("client-focus-change", {
        userId,
        focus,
      });
    },
    [userId, pusherAvailable]
  );

  // Update cursor position
  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;

      // Throttle cursor updates
      channelRef.current.trigger("client-cursor-move", {
        userId,
        position,
      });
    },
    [userId, pusherAvailable]
  );

  // Broadcast typing indicator
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;

      channelRef.current.trigger(
        isTyping ? "client-typing-start" : "client-typing-stop",
        { userId }
      );
    },
    [userId, pusherAvailable]
  );

  return {
    members,
    myMemberId,
    isConnected,
    isPusherAvailable: pusherAvailable,
    updateFocus,
    updateCursor,
    broadcastTyping,
  };
}
