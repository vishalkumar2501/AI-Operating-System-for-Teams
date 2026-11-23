import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useComments, useCreateComment, useDeleteComment } from './comments.queries';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface TaskCommentsSectionProps {
  taskId: string;
  typingUsers: string[];
  sendTyping: (isTyping: boolean) => void;
}

export function TaskCommentsSection({ taskId, typingUsers, sendTyping }: TaskCommentsSectionProps) {
  const { user } = useAuthStore();
  const { data: comments = [], isLoading } = useComments(taskId);
  const createComment = useCreateComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  const [body, setBody] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to latest comment
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom();
    }
  }, [comments.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);

    // Notify peers that this user is typing
    sendTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || createComment.isPending) return;

    sendTyping(false);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Extract potential @mentions
    const mentionMatches = trimmed.match(/@(\w+[\w.-]*)/g) ?? [];
    const mentions = mentionMatches.map((m) => m.slice(1));

    try {
      setBody('');
      await createComment.mutateAsync({
        body: trimmed,
        mentions,
      });
    } catch {
      setBody(trimmed); // restore on failure
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          Comments ({comments.length})
        </h4>
        <span className="text-[11px] text-slate-500">Realtime synced</span>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No comments yet. Start the discussion!
          </p>
        ) : (
          comments.map((comment) => {
            const isAuthor = comment.authorId === user?.id;
            return (
              <div
                key={comment.id}
                className="group relative flex gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-xs transition-colors hover:border-slate-700"
              >
                <Avatar
                  name={comment.author.name || comment.author.email}
                  src={comment.author.avatarUrl || undefined}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-slate-200 truncate">
                      {comment.author.name || comment.author.email}
                      {isAuthor && <span className="ml-1 text-[10px] text-indigo-400">(You)</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                    {comment.body}
                  </p>
                </div>

                {/* Delete button (author only) */}
                {isAuthor && (
                  <button
                    onClick={() => deleteComment.mutate(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity absolute top-2 right-2"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 italic animate-pulse">
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" />
            <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
            <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="relative mt-2">
        <textarea
          rows={2}
          value={body}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Press Enter to send)"
          className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || createComment.isPending}
          className="!absolute right-2 bottom-3 !p-1.5 !h-auto rounded-lg"
          title="Send comment"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
