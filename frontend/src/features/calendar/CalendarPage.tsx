import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  CheckSquare,
  Sparkles,
  Plus,
} from 'lucide-react';
import { calendarApi } from './calendar.api';
import { CreateMeetingModal } from '../meetings/CreateMeetingModal';
import { Spinner } from '@/components/ui';

export function CalendarPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);

  // Compute date range for query
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: feed, isLoading } = useQuery({
    queryKey: ['calendar', workspaceId, startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: () =>
      calendarApi.getUnifiedCalendar(workspaceId!, {
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      }),
    enabled: !!workspaceId,
  });

  const { data: freeBusy } = useQuery({
    queryKey: ['free-busy', workspaceId, selectedDay],
    queryFn: () => calendarApi.getFreeBusy(workspaceId!, { date: selectedDay, duration: 30 }),
    enabled: !!workspaceId && !!selectedDay,
  });

  const handlePrev = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().toISOString().split('T')[0]);
  };

  // Build Month Grid
  const daysInMonth = endOfMonth.getDate();
  const startDayOfWeek = startOfMonth.getDay(); // 0 is Sunday
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg text-text">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary dark:text-accent" />
            Team Calendar
          </h1>

          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              className="p-1 text-text-3 hover:text-text rounded hover:bg-surface-3 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-text-2 hover:text-text transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-text-3 hover:text-text rounded hover:bg-surface-3 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-sm font-semibold text-text">
            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-surface-2 border border-border p-0.5 text-xs">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded px-2.5 py-1 font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-primary dark:bg-accent text-on-primary dark:text-on-accent font-semibold shadow-sm'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary dark:bg-accent px-3 py-1.5 text-xs font-semibold text-on-primary dark:text-on-accent hover:opacity-90 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Schedule
          </button>
        </div>
      </div>

      {/* Main Body: Grid + Free/Busy Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="h-8 w-8 text-primary dark:text-accent" />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px border-b border-border text-center text-xs font-medium text-text-3 pb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Month calendar cells */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-border rounded-lg overflow-hidden border border-border mt-2">
                {/* Empty cells before month starts */}
                {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-surface-1/40 min-h-[90px] p-2" />
                ))}

                {/* Day cells */}
                {daysArray.map((day) => {
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayStr = dayDate.toISOString().split('T')[0];
                  const isSelected = selectedDay === dayStr;
                  const isToday = new Date().toISOString().split('T')[0] === dayStr;

                  // Find items on this day
                  const dayItems = feed?.filter((item) => item.startsAt.startsWith(dayStr)) || [];

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(dayStr)}
                      className={`min-h-[90px] bg-surface-1 p-2 cursor-pointer transition-colors hover:bg-surface-2 ${
                        isSelected ? 'ring-2 ring-primary dark:ring-accent bg-surface-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center ${
                            isToday
                              ? 'bg-primary dark:bg-accent text-on-primary dark:text-on-accent font-bold'
                              : 'text-text-3'
                          }`}
                        >
                          {day}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="text-[10px] text-text-3">{dayItems.length}</span>
                        )}
                      </div>

                      {/* Items stack */}
                      <div className="space-y-1 overflow-y-auto max-h-[75px]">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.type === 'MEETING') {
                                navigate(`/workspaces/${workspaceId}/meetings/${item.referenceId}`);
                              }
                            }}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 ${
                              item.type === 'MEETING'
                                ? 'bg-primary-subtle text-primary dark:bg-accent-subtle dark:text-accent border border-primary/20 dark:border-accent/20'
                                : 'bg-semantic-success/15 text-semantic-success border border-semantic-success/30'
                            }`}
                          >
                            {item.type === 'MEETING' ? (
                              <Video className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-[10px] text-text-3 font-medium pl-1">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Selected Day & Free/Busy Intelligence */}
        <div className="w-80 border-l border-border bg-surface-1 p-4 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">
                {new Date(selectedDay).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </h3>
              <p className="text-[11px] text-text-3">Scheduled events & open slots</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1 rounded bg-surface-2 text-text-2 hover:bg-primary dark:hover:bg-accent hover:text-on-primary dark:hover:text-on-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Events on selected day */}
          <div className="space-y-2 mb-6">
            <h4 className="text-xs font-semibold text-text-3 uppercase tracking-wider">
              Events ({feed?.filter((i) => i.startsAt.startsWith(selectedDay)).length || 0})
            </h4>

            {feed?.filter((i) => i.startsAt.startsWith(selectedDay)).length === 0 ? (
              <p className="text-xs text-text-3 py-3 text-center">No events on this date</p>
            ) : (
              feed
                ?.filter((i) => i.startsAt.startsWith(selectedDay))
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'MEETING') {
                        navigate(`/workspaces/${workspaceId}/meetings/${item.referenceId}`);
                      }
                    }}
                    className="rounded-lg border border-border bg-surface-2 p-2.5 hover:border-border-strong cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-text mb-1">
                      {item.type === 'MEETING' ? (
                        <Video className="h-3.5 w-3.5 text-primary dark:text-accent" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5 text-semantic-success" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="text-[11px] text-text-3 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.startsAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(item.endsAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Free / Busy Intelligence */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text dark:text-accent mb-2">
              <span className="inline-flex items-center justify-center p-1 rounded bg-ai-bg text-ai-text text-[10px] font-bold">
                <Sparkles className="h-3 w-3" />
              </span>
              <span>Free / Busy Assistant (30m)</span>
            </div>

            <p className="text-[11px] text-text-3 mb-3">
              Open slots without scheduling conflicts across team working hours (09:00 - 18:00):
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {!freeBusy || freeBusy.availableSlots.length === 0 ? (
                <p className="text-xs text-text-3">No free slots found.</p>
              ) : (
                freeBusy.availableSlots.slice(0, 8).map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-left rounded bg-surface-2 border border-border px-2 py-1 text-xs text-text-2 hover:border-primary/50 dark:hover:border-accent/50 hover:text-text flex items-center justify-between transition-colors"
                  >
                    <span>
                      {new Date(slot.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(slot.end).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[10px] text-semantic-success font-medium">Available</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateMeetingModal
        workspaceId={workspaceId!}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
