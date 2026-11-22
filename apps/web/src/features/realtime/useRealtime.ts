import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { SocketEvents, type PresenceUser, type CommentItem } from '@teamos/shared';
import type { TaskItem } from '@/features/tasks/tasks.queries';

/**
 * Hook to maintain live presence in a workspace.
 * Automatically joins workspace room, sends 25-second heartbeats,
 * and maintains the list of active members.
 */
export function useWorkspacePresence(workspaceId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    const socket = getSocket();

    socket.emit(SocketEvents.JOIN_WORKSPACE, workspaceId);

    const handlePresence = (payload: { workspaceId: string; users: PresenceUser[] }) => {
      if (payload.workspaceId === workspaceId) {
        setOnlineUsers(payload.users);
      }
    };

    socket.on(SocketEvents.PRESENCE_UPDATE, handlePresence);

    // Heartbeat every 25 seconds
    const interval = setInterval(() => {
      socket.emit(SocketEvents.PRESENCE_HEARTBEAT, workspaceId);
    }, 25_000);

    return () => {
      clearInterval(interval);
      socket.off(SocketEvents.PRESENCE_UPDATE, handlePresence);
      socket.emit(SocketEvents.LEAVE_WORKSPACE, workspaceId);
    };
  }, [workspaceId]);

  return { onlineUsers };
}

/**
 * Hook to manage real-time events for an active Task Detail Drawer:
 * - Shows who else is viewing the task (viewer avatars stack)
 * - Typing indicator ("User is typing...")
 * - Real-time incoming comments & comment deletions (<300ms)
 */
export function useTaskRealtime(taskId: string | null) {
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!taskId) return;
    const socket = getSocket();

    socket.emit(SocketEvents.JOIN_TASK, taskId);

    // 1. Viewers update
    const handleViewers = (payload: { taskId: string; viewers: PresenceUser[] }) => {
      if (payload.taskId === taskId) {
        setViewers(payload.viewers);
      }
    };
    socket.on(SocketEvents.TASK_VIEWERS_UPDATE, handleViewers);

    // 2. Typing indicator
    const handleTyping = (payload: {
      taskId: string;
      userId: string;
      name: string;
      isTyping: boolean;
    }) => {
      if (payload.taskId !== taskId) return;

      const { name, isTyping } = payload;
      if (isTyping) {
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));

        // Clear previous timeout for this user if active
        if (typingTimeoutRef.current[name]) {
          clearTimeout(typingTimeoutRef.current[name]);
        }
        // Auto-clear typing indicator after 3.5 seconds of inactivity
        typingTimeoutRef.current[name] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== name));
          delete typingTimeoutRef.current[name];
        }, 3500);
      } else {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
        if (typingTimeoutRef.current[name]) {
          clearTimeout(typingTimeoutRef.current[name]);
          delete typingTimeoutRef.current[name];
        }
      }
    };
    socket.on(SocketEvents.USER_TYPING, handleTyping);

    // 3. Real-time Comment Created (<300ms)
    const handleCommentCreated = (newComment: CommentItem) => {
      if (newComment.taskId === taskId) {
        queryClient.setQueryData<CommentItem[]>(['comments', taskId], (old = []) => {
          if (old.some((c) => c.id === newComment.id)) return old;
          return [...old, newComment];
        });
      }
    };
    socket.on(SocketEvents.COMMENT_CREATED, handleCommentCreated);

    // 4. Real-time Comment Deleted
    const handleCommentDeleted = (payload: { taskId: string; commentId: string }) => {
      if (payload.taskId === taskId) {
        queryClient.setQueryData<CommentItem[]>(['comments', taskId], (old = []) =>
          old.filter((c) => c.id !== payload.commentId)
        );
      }
    };
    socket.on(SocketEvents.COMMENT_DELETED, handleCommentDeleted);

    return () => {
      socket.off(SocketEvents.TASK_VIEWERS_UPDATE, handleViewers);
      socket.off(SocketEvents.USER_TYPING, handleTyping);
      socket.off(SocketEvents.COMMENT_CREATED, handleCommentCreated);
      socket.off(SocketEvents.COMMENT_DELETED, handleCommentDeleted);
      socket.emit(SocketEvents.LEAVE_TASK, taskId);

      // Clear timeouts
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };
  }, [taskId, queryClient]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!taskId) return;
      const socket = getSocket();
      socket.emit(SocketEvents.TASK_TYPING, { taskId, isTyping });
    },
    [taskId]
  );

  return { viewers, typingUsers, sendTyping };
}

/**
 * Hook to listen for live project-level task mutations (Kanban card movements, status changes).
 */
export function useProjectRealtime(projectId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    socket.emit(SocketEvents.JOIN_PROJECT, projectId);

    const handleTaskUpdated = (_updatedTask: TaskItem) => {
      // Invalidate tasks query to re-sync Kanban and List views in realtime
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-graph', projectId] });
    };

    socket.on(SocketEvents.TASK_UPDATED, handleTaskUpdated);

    return () => {
      socket.off(SocketEvents.TASK_UPDATED, handleTaskUpdated);
      socket.emit(SocketEvents.LEAVE_PROJECT, projectId);
    };
  }, [projectId, queryClient]);
}
