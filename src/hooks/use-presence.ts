"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getPusherClient, isPusherAvailable } from "@/lib/pusher/client";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { PresenceChannel } from "pusher-js";

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

interface DbParticipant {
  id: string;
  odId?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface UsePresenceOptions {
  reviewId: string;
  userId?: string;
  dbParticipants?: DbParticipant[];
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
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
}

interface MemberUpdateData {
  userId: string;
  updates: Partial<PresenceMember>;
}

function generateColor(id: string): string {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16",
    "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

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
  const [realtimeMembers, setRealtimeMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const pusherAvailable = isPusherAvailable();
  const channelRef = useRef<PresenceChannel | null>(null);

  // Store callbacks in refs to avoid effect re-runs when callbacks change
  const callbacksRef = useRef({ onMemberJoined, onMemberLeft, onMemberUpdated });
  useEffect(() => {
    callbacksRef.current = { onMemberJoined, onMemberLeft, onMemberUpdated };
  });

  const dbMembers = useMemo(() => {
    if (!dbParticipants || dbParticipants.length === 0) return [];
    return dbParticipants.map((p) => ({
      id: p.user.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email,
      role: "Participant",
      avatar: generateAvatar(p.user.firstName, p.user.lastName),
      color: generateColor(p.user.id),
      isOnline: true,
      lastSeenAt: new Date(),
    }));
  }, [dbParticipants]);

  useEffect(() => {
    console.log("[usePresence] useEffect check:", { pusherAvailable, userId, reviewId });
    if (!pusherAvailable || !userId || !reviewId) return;
    
    console.log("[usePresence] Subscribing to Pusher channel...");
    const pusher = getPusherClient();
    const channelName = CHANNELS.reviewPresence(reviewId);
    const presenceChannel = pusher.subscribe(channelName) as PresenceChannel;
    channelRef.current = presenceChannel;

    presenceChannel.bind("pusher:subscription_succeeded", (data: { myID: string; members: Record<string, PusherMemberInfo>; count: number }) => {
      console.log("[usePresence] Subscription succeeded!", data);
      setIsConnected(true);
      setMyMemberId(data.myID);

      const memberList: PresenceMember[] = [];
      
      // Pusher members object - iterate over the members property
      if (data.members && typeof data.members === 'object') {
        Object.entries(data.members).forEach(([id, info]) => {
          memberList.push({
            id,
            name: info?.name || "Unknown",
            email: info?.email || "",
            role: info?.role || "Participant",
            avatar: info?.avatar || id.substring(0, 2).toUpperCase(),
            color: info?.color || generateColor(id),
            isOnline: true,
            lastSeenAt: new Date(),
          });
        });
      }
      
      setRealtimeMembers(memberList);
    });

    presenceChannel.bind("pusher:subscription_error", (error: unknown) => {
      console.error("[usePresence] Subscription error:", error);
    });

    presenceChannel.bind("pusher:member_added", (member: { id: string; info: PusherMemberInfo }) => {
      console.log("[usePresence] Member added:", member);
      const newMember: PresenceMember = {
        id: member.id,
        name: member.info?.name || "Unknown",
        email: member.info?.email || "",
        role: member.info?.role || "Participant",
        avatar: member.info?.avatar || member.id.substring(0, 2).toUpperCase(),
        color: member.info?.color || generateColor(member.id),
        isOnline: true,
        lastSeenAt: new Date(),
      };
      setRealtimeMembers((prev) => [...prev.filter((m) => m.id !== member.id), newMember]);
      callbacksRef.current.onMemberJoined?.(newMember);
    });

    presenceChannel.bind("pusher:member_removed", (member: { id: string; info: PusherMemberInfo }) => {
      console.log("[usePresence] Member removed:", member);
      setRealtimeMembers((prev) => prev.filter((m) => m.id !== member.id));
      callbacksRef.current.onMemberLeft?.(member.id);
    });

    presenceChannel.bind(EVENTS.MEMBER_UPDATED, (data: MemberUpdateData) => {
      setRealtimeMembers((prev) => {
        const updatedMembers = prev.map((m) =>
          m.id === data.userId ? { ...m, ...data.updates, lastSeenAt: new Date() } : m
        );
        // Call the callback with the updated member
        const updatedMember = updatedMembers.find((m) => m.id === data.userId);
        if (updatedMember) {
          callbacksRef.current.onMemberUpdated?.(updatedMember);
        }
        return updatedMembers;
      });
    });

    return () => {
      console.log("[usePresence] Cleanup - unsubscribing");
      presenceChannel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [pusherAvailable, userId, reviewId]);

  const members = (pusherAvailable && isConnected && realtimeMembers.length > 0)
    ? realtimeMembers
    : dbMembers;

  const updateFocus = useCallback(
    (focus: string) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;
      channelRef.current.trigger("client-focus-change", { userId, focus });
    },
    [userId, pusherAvailable]
  );

  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;
      channelRef.current.trigger("client-cursor-move", { userId, position });
    },
    [userId, pusherAvailable]
  );

  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !userId || !pusherAvailable) return;
      channelRef.current.trigger(isTyping ? "client-typing-start" : "client-typing-stop", { userId });
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
