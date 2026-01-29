"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher/client";
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
  onMemberJoined?: (member: PresenceMember) => void;
  onMemberLeft?: (memberId: string) => void;
  onMemberUpdated?: (member: PresenceMember) => void;
}

interface UsePresenceReturn {
  members: PresenceMember[];
  myMemberId: string | null;
  isConnected: boolean;
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
    each: (callback: (member: { id: string; info: PusherMemberInfo }) => void) => void;
  };
}

export function usePresence({
  reviewId,
  onMemberJoined,
  onMemberLeft,
  onMemberUpdated,
}: UsePresenceOptions): UsePresenceReturn {
  const { data: session } = useSession();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  const channelRef = useRef<PresenceChannel | null>(null);
  const privateChannelRef = useRef<Channel | null>(null);
  const membersRef = useRef<PresenceMember[]>([]);

  // Keep membersRef in sync
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!session?.user || !reviewId) return;

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
        data.members.each((member: { id: string; info: PusherMemberInfo }) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _infoId, ...infoRest } = member.info;
          memberList.push({
            id: member.id,
            ...infoRest,
            isOnline: true,
            lastSeenAt: new Date(),
          } as PresenceMember);
        });

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
      (data: { userId: string; updates?: Partial<PresenceMember> } & Partial<PresenceMember>) => {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === data.userId
              ? { ...m, ...data.updates, ...data, lastSeenAt: new Date() }
              : m
          )
        );

        const updatedMember = membersRef.current.find((m) => m.id === data.userId);
        if (updatedMember) {
          onMemberUpdated?.({ ...updatedMember, ...data.updates, ...data });
        }
      }
    );

    // Handle cursor movements
    presenceChannel.bind(
      EVENTS.CURSOR_MOVE,
      (data: { userId: string; position: { x: number; y: number } }) => {
        if (data.userId !== session.user.id) {
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
  }, [session?.user, reviewId, onMemberJoined, onMemberLeft, onMemberUpdated]);

  // Update focus (which element user is viewing/editing)
  const updateFocus = useCallback(
    (focus: string) => {
      if (!channelRef.current || !session?.user) return;

      channelRef.current.trigger("client-focus-change", {
        userId: session.user.id,
        focus,
      });
    },
    [session]
  );

  // Update cursor position
  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (!channelRef.current || !session?.user) return;

      // Throttle cursor updates
      channelRef.current.trigger("client-cursor-move", {
        userId: session.user.id,
        position,
      });
    },
    [session]
  );

  // Broadcast typing indicator
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !session?.user) return;

      channelRef.current.trigger(
        isTyping ? "client-typing-start" : "client-typing-stop",
        { userId: session.user.id }
      );
    },
    [session]
  );

  return {
    members,
    myMemberId,
    isConnected,
    updateFocus,
    updateCursor,
    broadcastTyping,
  };
}
