import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, X, Send, AlertTriangle, Calendar, FolderKanban } from 'lucide-react';
import { aiApi } from './ai.api';
import { ApprovalCard } from './ApprovalCard';
import { ProposedAction } from '@teamos/shared';
import { Spinner } from '@/components/ui';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  proposedActions?: ProposedAction[];
  timestamp: string;
}

interface AiAssistantDrawerProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function AiAssistantDrawer({
  workspaceId,
  isOpen,
  onClose,
  projectId,
}: AiAssistantDrawerProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hi! I'm your TeamOS AI Assistant. I monitor dependencies, surface bottlenecks, and propose actions that execute only after your approval.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (promptText: string) => aiApi.chat(workspaceId, promptText, { projectId }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.runId,
          sender: 'ai',
          text: data.response,
          proposedActions: data.proposedActions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setInput('');
    chatMutation.mutate(promptText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:w-[420px] bg-surface-1 border-l-2 border-ai-border/80 shadow-2xl flex flex-col text-text">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai-bg text-ai-text border border-ai-border">
            <Sparkles className="h-4 w-4 text-ai-text" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
              TeamOS Intelligence
              <span className="rounded-full bg-ai-bg text-ai-text border border-ai-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                AI
              </span>
            </h3>
            <p className="text-[10px] text-text-3">Write actions require your approval</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-1.5 p-3 border-b border-border bg-surface-2/30 overflow-x-auto text-[11px] scrollbar-thin">
        <button
          onClick={() => handleSend('Scan for project bottlenecks and risks')}
          className="rounded-full bg-surface-2 hover:bg-ai-subtle hover:text-ai-text hover:border-ai-border border border-border px-2.5 py-1 text-text-2 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <AlertTriangle className="h-3 w-3 text-semantic-warning" />
          Check Risks
        </button>
        <button
          onClick={() => handleSend('What is my upcoming agenda?')}
          className="rounded-full bg-surface-2 hover:bg-ai-subtle hover:text-ai-text hover:border-ai-border border border-border px-2.5 py-1 text-text-2 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Calendar className="h-3 w-3 text-semantic-info" />
          My Agenda
        </button>
        <button
          onClick={() => handleSend('Give me an overview of project progress')}
          className="rounded-full bg-surface-2 hover:bg-ai-subtle hover:text-ai-text hover:border-ai-border border border-border px-2.5 py-1 text-text-2 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <FolderKanban className="h-3 w-3 text-semantic-success" />
          Progress
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-primary text-on-primary rounded-br-none font-medium'
                  : 'bg-surface-2 text-text border border-border rounded-bl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>

            {/* Proposed Write Actions requiring human approval */}
            {m.proposedActions && m.proposedActions.length > 0 && (
              <div className="w-full mt-3 space-y-2">
                {m.proposedActions.map((action) => (
                  <ApprovalCard key={action.id} workspaceId={workspaceId} action={action} />
                ))}
              </div>
            )}

            <span className="text-[10px] text-text-3 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-text-2 p-2.5 bg-surface-2 border border-border rounded-xl w-fit">
            <Spinner className="h-3.5 w-3.5 text-accent" />
            <span>AI analyzing graph & thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-border bg-surface-2/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI or type 'Create task: ...'"
            className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs text-text placeholder:text-text-3 focus:border-ai-border focus:ring-1 focus:ring-ai-border focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="rounded-lg bg-ai-bg p-2 text-ai-text hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-40 transition-colors border border-ai-border font-bold shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
export default AiAssistantDrawer;
