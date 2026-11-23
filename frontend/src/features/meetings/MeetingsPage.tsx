import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileAudio,
} from 'lucide-react';
import { meetingApi } from './meeting.api';
import { CreateMeetingModal } from './CreateMeetingModal';
import { Avatar, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { ParticipantRsvp } from '@teamos/shared';

export function MeetingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings', workspaceId],
    queryFn: () => meetingApi.getMeetings(workspaceId!),
    enabled: !!workspaceId,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ meetingId, rsvp }: { meetingId: string; rsvp: ParticipantRsvp }) =>
      meetingApi.updateRsvp(workspaceId!, meetingId, rsvp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] });
    },
  });

  const now = new Date();
  const filteredMeetings = meetings?.filter((m) => {
    const end = new Date(m.endsAt);
    if (filter === 'upcoming') return end >= now;
    if (filter === 'past') return end < now;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="h-6 w-6 text-indigo-400" />
            Meetings & Audio Sync
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Schedule team syncs, upload audio recordings, and let AI extract summary & action items.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 mb-6">
        {(['upcoming', 'past', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            {tab} Meetings
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-500" />
        </div>
      ) : !filteredMeetings || filteredMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/40">
          <Video className="h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-white">No meetings found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            {filter === 'upcoming'
              ? 'No upcoming meetings scheduled. Click "Schedule Meeting" to create one.'
              : 'No past meetings recorded in this workspace.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => {
            const myParticipant = meeting.participants.find((p) => p.userId === user?.id);
            const myRsvp = myParticipant?.rsvp || 'PENDING';
            const isOrganizer = meeting.organizerId === user?.id;
            const startsDate = new Date(meeting.startsAt);
            const endsDate = new Date(meeting.endsAt);

            return (
              <div
                key={meeting.id}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm hover:border-slate-700 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate(`/workspaces/${workspaceId}/meetings/${meeting.id}`)}
              >
                {/* Top Badge & Project */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {meeting.project ? (
                    <span className="rounded bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                      [{meeting.project.key}] {meeting.project.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">General Workspace</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                      meeting.status === 'COMPLETED'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                        : meeting.status === 'IN_PROGRESS'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40 animate-pulse'
                          : 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                    }`}
                  >
                    {meeting.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                  {meeting.title}
                </h3>

                {/* Timing */}
                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {startsDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {startsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {endsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Transcript badge if processed */}
                {meeting.transcript && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30 px-3 py-1.5 text-xs text-emerald-300">
                    <FileAudio className="h-3.5 w-3.5" />
                    <span>AI Transcript & Actions Ready</span>
                  </div>
                )}

                {/* Footer: Organizer, Participants & Actions */}
                <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={meeting.organizer.name}
                      src={meeting.organizer.avatarUrl}
                      className="h-6 w-6 text-[10px]"
                    />
                    <span className="text-xs text-slate-400 truncate max-w-[100px]">
                      {isOrganizer ? 'You (Host)' : meeting.organizer.name}
                    </span>
                  </div>

                  {/* Join Link / RSVP */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {meeting.meetingUrl && (
                      <a
                        href={meeting.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/40 px-2 py-1 rounded-md"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join
                      </a>
                    )}

                    {!isOrganizer && (
                      <div className="flex items-center gap-1">
                        <button
                          title="Accept"
                          onClick={() =>
                            rsvpMutation.mutate({ meetingId: meeting.id, rsvp: 'ACCEPTED' })
                          }
                          className={`p-1 rounded hover:bg-slate-800 ${
                            myRsvp === 'ACCEPTED' ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          title="Decline"
                          onClick={() =>
                            rsvpMutation.mutate({ meetingId: meeting.id, rsvp: 'DECLINED' })
                          }
                          className={`p-1 rounded hover:bg-slate-800 ${
                            myRsvp === 'DECLINED' ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <CreateMeetingModal
        workspaceId={workspaceId!}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
