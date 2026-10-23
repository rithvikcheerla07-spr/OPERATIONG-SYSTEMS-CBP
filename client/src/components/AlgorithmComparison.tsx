import React from 'react';
import { GitCompare, X, Award, CheckCircle, BarChart3 } from 'lucide-react';
import { ComparisonResult } from '../types.js';

interface AlgorithmComparisonProps {
  comparison: ComparisonResult;
  onClose: () => void;
  quantum: number;
}

export const AlgorithmComparison: React.FC<AlgorithmComparisonProps> = ({
  comparison,
  onClose,
  quantum,
}) => {
  const algos = [
    { key: 'FCFS', label: 'First-Come, First-Served', result: comparison.FCFS },
    { key: 'SJF', label: 'Shortest Job First (Non-preemptive)', result: comparison.SJF },
    { key: 'RR', label: `Round Robin (q = ${quantum})`, result: comparison.RR },
  ];

  // Determine which algorithm performed best on each metric
  const bestWaiting = Math.min(...algos.map((a) => a.result.metrics.averages.waiting));
  const bestTAT = Math.min(...algos.map((a) => a.result.metrics.averages.turnaround));
  const bestResponse = Math.min(...algos.map((a) => a.result.metrics.averages.response));
  const lowestSwitches = Math.min(...algos.map((a) => a.result.metrics.contextSwitches));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-600" />
            Scheduling Algorithm Comparative Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Real outputs calculated across all three policies by the Linux C engine on identical process inputs
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Return to Single Simulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Side-by-side Comparative Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {algos.map(({ key, label, result }) => {
          const m = result.metrics;
          const isBestWait = m.averages.waiting === bestWaiting;
          const isBestTAT = m.averages.turnaround === bestTAT;
          const isBestResp = m.averages.response === bestResponse;

          return (
            <div
              key={key}
              className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 text-sm">{key}</div>
                  <span className="text-[11px] font-mono text-slate-500">{label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Avg Waiting
                    </div>
                    <div className="text-base font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{m.averages.waiting.toFixed(2)}</span>
                      {isBestWait && (
                        <span title="Lowest Avg Waiting">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Avg Turnaround
                    </div>
                    <div className="text-base font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{m.averages.turnaround.toFixed(2)}</span>
                      {isBestTAT && (
                        <span title="Lowest Avg Turnaround">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Avg Response
                    </div>
                    <div className="text-base font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{m.averages.response.toFixed(2)}</span>
                      {isBestResp && (
                        <span title="Lowest Avg Response">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Context Switches
                    </div>
                    <div className="text-base font-mono font-bold text-slate-900">
                      {m.contextSwitches}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <span>CPU Utilization:</span>
                  <span className="font-bold text-indigo-700">{m.cpuUtilization.toFixed(1)}%</span>
                </div>
              </div>

              {/* Mini Gantt Sequence */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Execution Order ({m.totalTime} units total)
                </div>
                <div className="flex h-7 rounded overflow-hidden border border-slate-300 bg-slate-200 text-[10px] font-mono">
                  {result.gantt.map((seg, idx) => {
                    const widthPct = ((seg.end - seg.start) / m.totalTime) * 100;
                    return (
                      <div
                        key={idx}
                        style={{ width: `${widthPct}%` }}
                        className={`flex items-center justify-center border-r border-white/20 px-0.5 truncate ${
                          seg.isIdle
                            ? 'bg-slate-300 text-slate-600'
                            : 'bg-indigo-600 text-white font-semibold'
                        }`}
                        title={`${seg.isIdle ? 'IDLE' : seg.pid}: ${seg.start}-${seg.end}`}
                      >
                        {seg.isIdle ? 'IDLE' : seg.pid}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Academic Takeaway Summary */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
        <div className="font-semibold text-slate-900">Lab Analysis Observations:</div>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>
            <strong>SJF Optimality:</strong> Shortest Job First typically minimizes average waiting time when burst times are known upfront.
          </li>
          <li>
            <strong>Round Robin Responsiveness:</strong> Round Robin delivers rapid initial CPU response times for interactive tasks, but incurs higher context switch overhead.
          </li>
          <li>
            <strong>FCFS Predictability:</strong> First-Come First-Served eliminates preemption and context switches, but is vulnerable to the convoy effect if long bursts arrive early.
          </li>
        </ul>
      </div>
    </div>
  );
};
