import React from 'react';
import { Play, BookOpen, Layers, Terminal, RotateCcw, Cpu } from 'lucide-react';

interface LandingHeroProps {
  onStartSimulation: () => void;
  onOpenHelp: () => void;
  isSimulating: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartSimulation,
  onOpenHelp,
  isSimulating,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Context line with typographic separators (anti-slop / zero-pill discipline) */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <span>OS with Linux Laboratory</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Kernel Process Scheduling</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-indigo-600 font-mono">POSIX C99 Engine</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Operating System Execution Replay &amp; State Analysis System
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              An educational CPU-scheduling analysis environment powered by a Linux-executed C scheduler. Unlike conventional tools that render only a static post-mortem Gantt chart, this system captures full system snapshots at each scheduling event—enabling deterministic, state-aware execution replay.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onStartSimulation}
                disabled={isSimulating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'Executing C Engine...' : 'Run Simulation'}</span>
              </button>

              <button
                onClick={onOpenHelp}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-100/70 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Lab Reference &amp; Rules</span>
              </button>
            </div>
          </div>

          {/* Quick architectural feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2.5 pt-2 md:pt-0 md:w-80 shrink-0">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900">State-Aware Replay (USP)</div>
                <div className="text-xs text-slate-500 leading-snug">
                  Previous, Next, and Reset restore full snapshots of CPU, Ready Queue, and remaining burst.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
              <Terminal className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Linux C Engine</div>
                <div className="text-xs text-slate-500 leading-snug">
                  Compiled via GCC / Makefile, fed via stdin, and verified with strict schema checks.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
              <Layers className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Deterministic Model</div>
                <div className="text-xs text-slate-500 leading-snug">
                  Rigorous FCFS, non-preemptive SJF, and Round Robin scheduling with precise tie-breaking.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
