import React, { useRef, useEffect } from 'react';
import {
  ListFilter,
  ArrowDownCircle,
  PlayCircle,
  Clock,
  CheckCircle2,
  StopCircle,
  Flag,
} from 'lucide-react';
import { SimEvent, EventType } from '../types.js';

interface EventTimelineProps {
  events: SimEvent[];
  currentIndex: number;
  onSelectEvent: (index: number) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  currentIndex,
  onSelectEvent,
}) => {
  const activeEventRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the active event card into view
  useEffect(() => {
    if (activeEventRef.current) {
      activeEventRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentIndex]);

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'ARRIVAL':
        return <ArrowDownCircle className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'CPU_ASSIGNED':
        return <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'QUANTUM_EXPIRED':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'PROCESS_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'CPU_IDLE':
        return <StopCircle className="w-4 h-4 text-slate-400 shrink-0" />;
      case 'SIMULATION_COMPLETE':
        return <Flag className="w-4 h-4 text-purple-600 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getEventBadgeClass = (type: EventType) => {
    switch (type) {
      case 'ARRIVAL':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'CPU_ASSIGNED':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'QUANTUM_EXPIRED':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'PROCESS_COMPLETED':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'CPU_IDLE':
        return 'text-slate-600 bg-slate-100 border-slate-300';
      case 'SIMULATION_COMPLETE':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-indigo-600" />
            Execution Event History ({events.length})
          </h2>
          <p className="text-xs text-slate-500">
            Click any event to restore and inspect that point in time
          </p>
        </div>
      </div>

      {/* Scrollable Event List */}
      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 focus:outline-none">
        {events.map((ev, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={ev.index}
              ref={isActive ? activeEventRef : null}
              onClick={() => onSelectEvent(idx)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                isActive
                  ? 'bg-indigo-50/80 border-indigo-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="font-mono text-[11px] text-slate-400 w-6 text-right shrink-0">
                  #{idx + 1}
                </span>

                <div className="font-mono text-slate-700 font-semibold w-14 shrink-0">
                  t = {ev.time}
                </div>

                <div className="flex items-center gap-2 overflow-hidden">
                  {getEventIcon(ev.type)}
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${getEventBadgeClass(
                      ev.type
                    )}`}
                  >
                    {ev.type.replace('_', ' ')}
                  </span>
                  <span className="text-slate-700 truncate font-normal">
                    {ev.description}
                  </span>
                </div>
              </div>

              {/* Snapshot Summary Indicator */}
              <div className="hidden sm:flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-500">
                {ev.snapshot.running ? (
                  <span className="text-emerald-700 font-medium">
                    CPU: {ev.snapshot.running}
                  </span>
                ) : (
                  <span className="text-slate-400">CPU: IDLE</span>
                )}
                <span>·</span>
                <span>Queue: {ev.snapshot.readyQueue.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
