import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FolderKanban,
} from 'lucide-react';
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
    mutationFn: (promptText: string) =>
      aiApi.chat(workspaceId, promptText, { projectId }),
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
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              TeamOS Intelligence
              <span className="rounded-full bg-indigo-950 text-indigo-400 border border-indigo-700/50 px-1.5 py-0.2 text-[9px] font-semibold uppercase">
                Human-in-the-Loop
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Write actions require your approval</p>
          </div>
        </div>

        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-1.5 p-3 border-b border-slate-800/80 bg-slate-950/20 overflow-x-auto text-[11px]">
        <button
          onClick={() => handleSend('Scan for project bottlenecks and risks')}
          className="rounded-full bg-slate-800/80 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-700 px-2.5 py-1 text-slate-300 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          Check Risks
        </button>
        <button
          onClick={() => handleSend('What is my upcoming agenda?')}
          className="rounded-full bg-slate-800/80 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-700 px-2.5 py-1 text-slate-300 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Calendar className="h-3 w-3 text-blue-400" />
          My Agenda
        </button>
        <button
          onClick={() => handleSend('Give me an overview of project progress')}
          className="rounded-full bg-slate-800/80 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-700 px-2.5 py-1 text-slate-300 whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <FolderKanban className="h-3 w-3 text-emerald-400" />
          Progress
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>

            {/* Proposed Write Actions requiring human approval */}
            {m.proposedActions && m.proposedActions.length > 0 && (
              <div className="w-full mt-3 space-y-2">
                {m.proposedActions.map((action) => (
                  <ApprovalCard
                    key={action.id}
                    workspaceId={workspaceId}
                    action={action}
                  />
                ))}
              </div>
            )}

            <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-800/40 rounded-xl w-fit">
            <Spinner className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI analyzing graph & thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70">
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
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
