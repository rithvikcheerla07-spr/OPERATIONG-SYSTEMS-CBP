import React from 'react';
import { Cpu, ListOrdered, CheckCircle2, Clock, PlayCircle, StopCircle, ArrowRight } from 'lucide-react';
import { ProcessInput, ProcessState, SystemSnapshot } from '../types.js';

interface StateInspectorProps {
  snapshot: SystemSnapshot | null;
  processes: ProcessInput[];
  currentTime: number;
}

export const StateInspector: React.FC<StateInspectorProps> = ({
  snapshot,
  processes,
  currentTime,
}) => {
  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
        No state snapshot available.
      </div>
    );
  }

  const { running, readyQueue, states, remaining } = snapshot;

  // Helper for colorblind-safe state pill styling with clear textual label
  const renderStateBadge = (state: ProcessState) => {
    switch (state) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>[NEW] Not arrived</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>[READY] In queue</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>[RUN] Executing</span>
          </span>
        );
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-200/80 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>[DONE] Terminated</span>
          </span>
        );
      default:
        return <span className="font-mono text-xs">{state}</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            Simulated System State Inspector
          </h2>
          <p className="text-xs text-slate-500">
            Direct snapshot restoration at timestamp <span className="font-mono font-bold text-indigo-700">t = {currentTime}</span>
          </p>
        </div>
      </div>

      {/* Hardware / Scheduler State: CPU Core & Ready Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Core Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              CPU Core Status
            </span>
            <span className="font-mono text-[11px] text-slate-400">Execution Register</span>
          </div>

          <div className="flex items-center justify-center p-4 bg-white rounded-md border border-slate-200 min-h-[72px]">
            {running ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs">
                  {running}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Process {running} is Active
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Remaining burst: <strong className="text-emerald-700">{remaining[running]} units</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                <StopCircle className="w-4 h-4 text-slate-300" />
                <span>CPU is IDLE (No process executing)</span>
              </div>
            )}
          </div>
        </div>

        {/* Ready Queue Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-amber-600" />
              Ready Queue (FIFO)
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {readyQueue.length} process{readyQueue.length === 1 ? '' : 'es'} queued
            </span>
          </div>

          <div className="flex items-center p-3 bg-white rounded-md border border-slate-200 min-h-[72px] overflow-x-auto">
            {readyQueue.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold text-slate-400">HEAD:</span>
                {readyQueue.map((pid, idx) => (
                  <React.Fragment key={pid}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded text-xs font-mono font-semibold text-amber-900 shadow-xs">
                      <span>{pid}</span>
                      <span className="text-[10px] text-amber-600 font-normal">
                        ({remaining[pid]} rem)
                      </span>
                    </div>
                    {idx < readyQueue.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
                <span className="text-[11px] font-mono font-semibold text-slate-400">:TAIL</span>
              </div>
            ) : (
              <div className="text-slate-400 font-mono text-xs italic">
                Queue is empty (no waiting processes)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Process State Table */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">
          Process Control Block (PCB) Snapshots:
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-2.5">Process</th>
                <th scope="col" className="px-4 py-2.5">Arrival Time</th>
                <th scope="col" className="px-4 py-2.5">Original Burst</th>
                <th scope="col" className="px-4 py-2.5">Simulated State</th>
                <th scope="col" className="px-4 py-2.5">Remaining Burst</th>
                <th scope="col" className="px-4 py-2.5">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {processes.map((p) => {
                const state = states[p.pid] || 'NEW';
                const rem = remaining[p.pid] !== undefined ? remaining[p.pid] : p.burst;
                const completedBurst = p.burst - rem;
                const progressPct = Math.round((completedBurst / p.burst) * 100);

                const isCurrentRunning = running === p.pid;

                return (
                  <tr
                    key={p.pid}
                    className={`transition-colors ${
                      isCurrentRunning
                        ? 'bg-emerald-50/60 font-medium'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        {isCurrentRunning && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                        )}
                        <span>{p.pid}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">t = {p.arrival}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{p.burst}</td>
                    <td className="px-4 py-2.5">{renderStateBadge(state)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">
                      {rem} / {p.burst}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className={`h-full transition-all duration-150 ${
                              state === 'TERMINATED'
                                ? 'bg-slate-500'
                                : state === 'RUNNING'
                                ? 'bg-emerald-600'
                                : 'bg-indigo-600'
                            }`}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 w-8 text-right">
                          {progressPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
