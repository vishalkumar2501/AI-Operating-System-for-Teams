import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Users,
  FileAudio,
  Sparkles,
  CheckSquare,
  CheckCircle2,
} from 'lucide-react';
import { meetingApi } from './meeting.api';
import { Avatar, Spinner } from '@/components/ui';
import { ActionItemExtracted } from '@teamos/shared';

export function MeetingDetailPage() {
  const { workspaceId, meetingId } = useParams<{ workspaceId: string; meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedActionIndexes, setSelectedActionIndexes] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', workspaceId, meetingId],
    queryFn: () => meetingApi.getMeeting(workspaceId!, meetingId!),
    enabled: !!workspaceId && !!meetingId,
  });

  const transcribeMutation = useMutation({
    mutationFn: (file?: File) =>
      meetingApi.triggerTranscription(workspaceId!, meetingId!, { file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', workspaceId, meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (items: ActionItemExtracted[]) =>
      meetingApi.convertActions(
        workspaceId!,
        meetingId!,
        items.map((it) => ({
          title: it.title,
          priority: it.suggestedPriority || 'MEDIUM',
          dueDate: it.deadline || undefined,
        }))
      ),
    onSuccess: (data) => {
      setSuccessMessage(`Successfully created ${data.length} task(s) in project!`);
      setSelectedActionIndexes([]);
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (!meeting) {
    return <div className="p-8 text-center bg-slate-950 text-slate-400">Meeting not found.</div>;
  }

  const transcript = meeting.transcript;
  const actionItems: ActionItemExtracted[] = (transcript?.actionItems as any) || [];

  const handleToggleAction = (index: number) => {
    setSelectedActionIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleConvertSelected = () => {
    const itemsToConvert = actionItems.filter((_, idx) => selectedActionIndexes.includes(idx));
    if (itemsToConvert.length === 0) return;
    convertMutation.mutate(itemsToConvert);
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 text-slate-100">
      {/* Back button */}
      <button
        onClick={() => navigate(`/workspaces/${workspaceId}/meetings`)}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Meetings
      </button>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {meeting.project && (
                <span className="rounded bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                  [{meeting.project.key}] {meeting.project.name}
                </span>
              )}
              <span className="rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/40 px-2.5 py-0.5 text-xs font-medium uppercase">
                {meeting.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
            {meeting.description && (
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">{meeting.description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                {new Date(meeting.startsAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                {new Date(meeting.startsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(meeting.endsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                {meeting.participants.length} participant(s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {meeting.meetingUrl && (
              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                <Video className="h-4 w-4" />
                Join Video Call
              </a>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Main Grid: Transcript Timeline vs AI Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Transcript & Dialogue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileAudio className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-semibold text-white">
                  Audio Transcript & Diarization
                </h2>
              </div>

              {!transcript && (
                <button
                  onClick={() => transcribeMutation.mutate()}
                  disabled={transcribeMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {transcribeMutation.isPending ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate AI Transcript
                </button>
              )}
            </div>

            {transcribeMutation.isPending && (
              <div className="py-12 text-center">
                <Spinner className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm text-slate-300 font-medium">Processing audio with AI...</p>
                <p className="text-xs text-slate-500">
                  Transcribing speech and extracting key decisions
                </p>
              </div>
            )}

            {!transcript && !transcribeMutation.isPending && (
              <div className="py-12 text-center">
                <FileAudio className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-4">No audio recording or transcript yet.</p>
                <button
                  onClick={() => transcribeMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Sparkles className="h-4 w-4" />
                  Run AI Audio Pipeline
                </button>
              </div>
            )}

            {transcript && (
              <div className="space-y-4 pt-4">
                {transcript.segments && transcript.segments.length > 0 ? (
                  transcript.segments.map((seg, idx) => (
                    <div key={idx} className="flex gap-3 group">
                      <span className="text-[11px] font-mono text-slate-500 pt-0.5 shrink-0">
                        {formatMs(seg.startMs)}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-indigo-400">
                          {seg.speakerName || 'Speaker'}
                        </div>
                        <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">{seg.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {transcript.rawText}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Summary & Action Items */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">AI Meeting Summary</h2>
            </div>

            {transcript?.summary ? (
              <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4 text-sm text-slate-300 leading-relaxed">
                {transcript.summary}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Summary will appear automatically when transcript processing is triggered.
              </p>
            )}
          </div>

          {/* Extracted Action Items Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Extracted Action Items</h2>
              </div>
              <span className="text-xs text-slate-400">{actionItems.length} found</span>
            </div>

            {actionItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No action items extracted yet. Run the AI audio pipeline to detect tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item, idx) => {
                  const isSelected = selectedActionIndexes.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleAction(idx)}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-indigo-500/50 bg-indigo-950/30'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleAction(idx)}
                        className="mt-1 rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{item.title}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                          {item.assigneeName && <span>Assignee: {item.assigneeName}</span>}
                          {item.deadline && (
                            <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>
                          )}
                          {item.suggestedPriority && (
                            <span className="text-amber-400">{item.suggestedPriority}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleConvertSelected}
                  disabled={selectedActionIndexes.length === 0 || convertMutation.isPending}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                >
                  {convertMutation.isPending && <Spinner className="h-4 w-4" />}
                  Convert Selected ({selectedActionIndexes.length}) to Tasks
                </button>
              </div>
            )}
          </div>

          {/* Participants & RSVPs Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">
                Participants ({meeting.participants.length})
              </h2>
            </div>

            <div className="space-y-2">
              {meeting.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={p.user.name}
                      src={p.user.avatarUrl}
                      className="h-6 w-6 text-[10px]"
                    />
                    <span className="text-slate-300">{p.user.name}</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${
                      p.rsvp === 'ACCEPTED'
                        ? 'bg-emerald-950/80 text-emerald-400'
                        : p.rsvp === 'DECLINED'
                          ? 'bg-rose-950/80 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.rsvp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
