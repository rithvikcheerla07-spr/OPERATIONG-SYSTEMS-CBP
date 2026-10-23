import React, { useState } from 'react';
import { GanttSegment } from '../types.js';

interface GanttChartProps {
  segments: GanttSegment[];
  totalTime: number;
  currentTime: number;
  onTimeClick?: (time: number) => void;
}

// Consistent high-contrast academic color palette for processes
const PROCESS_PALETTE = [
  'bg-indigo-600 border-indigo-700 text-white',
  'bg-emerald-600 border-emerald-700 text-white',
  'bg-amber-600 border-amber-700 text-white',
  'bg-sky-600 border-sky-700 text-white',
  'bg-rose-600 border-rose-700 text-white',
  'bg-purple-600 border-purple-700 text-white',
  'bg-teal-600 border-teal-700 text-white',
  'bg-orange-600 border-orange-700 text-white',
  'bg-cyan-600 border-cyan-700 text-white',
  'bg-pink-600 border-pink-700 text-white',
];

export const GanttChart: React.FC<GanttChartProps> = ({
  segments,
  totalTime,
  currentTime,
  onTimeClick,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<GanttSegment | null>(null);

  if (!segments || segments.length === 0 || totalTime <= 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
        No execution timeline recorded. Run a simulation to generate the Gantt chart.
      </div>
    );
  }

  // Assign stable colors to distinct PIDs
  const uniquePids = Array.from(new Set(segments.filter((s) => !s.isIdle).map((s) => s.pid)));
  const getPidColor = (pid: string) => {
    const idx = uniquePids.indexOf(pid);
    if (idx === -1) return 'bg-slate-500 border-slate-600 text-white';
    return PROCESS_PALETTE[idx % PROCESS_PALETTE.length];
  };

  // Generate tick markers every 1 or 2 or 5 units depending on total time
  const step = totalTime <= 15 ? 1 : totalTime <= 30 ? 2 : totalTime <= 60 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= totalTime; t += step) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== totalTime) {
    ticks.push(totalTime);
  }

  // Marker percentage position
  const markerPercent = Math.min(100, Math.max(0, (currentTime / totalTime) * 100));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            CPU Execution Gantt Chart
          </h2>
          <p className="text-xs text-slate-500">
            Visual CPU allocation timeline · Synchronized with state replay at <span className="font-mono font-semibold text-indigo-700">t = {currentTime}</span>
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {uniquePids.map((pid) => (
            <div key={pid} className="flex items-center gap-1.5 font-mono">
              <span className={`w-3 h-3 rounded-xs border ${getPidColor(pid)} inline-block`} />
              <span className="text-slate-700">{pid}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-3 h-3 rounded-xs border border-slate-300 bg-slate-200 inline-block" />
            <span className="text-slate-500">IDLE</span>
          </div>
        </div>
      </div>

      {/* Gantt Bar Container */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip display */}
        {hoveredSegment && (
          <div className="mb-2 p-2 bg-slate-900 text-white rounded-md text-xs font-mono inline-flex items-center gap-2 shadow-md">
            <span className="font-semibold">{hoveredSegment.isIdle ? 'CPU IDLE' : hoveredSegment.pid}</span>
            <span>·</span>
            <span>Interval: [{hoveredSegment.start} → {hoveredSegment.end}]</span>
            <span>·</span>
            <span>Duration: {hoveredSegment.end - hoveredSegment.start} units</span>
          </div>
        )}

        <div className="relative w-full h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 flex">
          {segments.map((seg, idx) => {
            const duration = seg.end - seg.start;
            const widthPercent = (duration / totalTime) * 100;
            const isIdle = seg.isIdle || seg.pid === 'IDLE';

            return (
              <div
                key={idx}
                style={{ width: `${widthPercent}%` }}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => onTimeClick && onTimeClick(seg.start)}
                className={`relative h-full flex flex-col items-center justify-center border-r border-white/20 transition-all cursor-pointer select-none group ${
                  isIdle
                    ? 'bg-slate-200/90 text-slate-500 hover:bg-slate-300/80'
                    : `${getPidColor(seg.pid)} hover:brightness-110`
                }`}
                title={`${isIdle ? 'IDLE' : seg.pid}: ${seg.start} to ${seg.end}`}
              >
                <span className="text-xs font-mono font-bold tracking-tight px-1 truncate">
                  {isIdle ? 'IDLE' : seg.pid}
                </span>
                <span className="text-[10px] font-mono opacity-80 px-0.5">
                  {duration}
                </span>
              </div>
            );
          })}

          {/* Synchronized Replay Marker Line */}
          <div
            style={{ left: `${markerPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none transition-all duration-150"
          >
            <div className="absolute -top-6 -translate-x-1/2 bg-red-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-semibold shadow-xs">
              t={currentTime}
            </div>
            <div className="absolute -bottom-1 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45" />
          </div>
        </div>

        {/* Timeline Axis Ticks */}
        <div className="relative w-full h-6 mt-1.5">
          {ticks.map((t) => {
            const leftPercent = (t / totalTime) * 100;
            return (
              <div
                key={t}
                style={{ left: `${leftPercent}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center text-[10px] font-mono text-slate-500 cursor-pointer"
                onClick={() => onTimeClick && onTimeClick(t)}
              >
                <div className="w-px h-2 bg-slate-300" />
                <span className="mt-0.5">{t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
