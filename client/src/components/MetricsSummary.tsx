import React from 'react';
import { Activity, Clock, Cpu, Shuffle, HelpCircle } from 'lucide-react';
import { SimulationResult } from '../types.js';

interface MetricsSummaryProps {
  metrics: SimulationResult['metrics'];
  algorithm: string;
  quantum: number;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  metrics,
  algorithm,
  quantum,
}) => {
  if (!metrics) return null;

  const { processes, averages, cpuUtilization, contextSwitches, totalTime } = metrics;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Performance &amp; Efficiency Metrics
          </h2>
          <p className="text-xs text-slate-500">
            Computed by Linux C engine for {algorithm} {algorithm === 'RR' ? `(q = ${quantum})` : ''}
          </p>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Avg Waiting Time
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">
            {averages.waiting.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Σ Waiting / {processes.length}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Avg Turnaround Time
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">
            {averages.turnaround.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Σ Turnaround / {processes.length}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Avg Response Time
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">
            {averages.response.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Σ Response / {processes.length}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>CPU Utilization</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-mono font-bold text-indigo-700">
            {cpuUtilization.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Burst / {totalTime} total
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Context Switches</span>
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">
            {contextSwitches}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Non-idle switches
          </div>
        </div>
      </div>

      {/* Individual Process Metrics Table */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">
          Per-Process Analytical Accounting:
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-2.5">PID</th>
                <th scope="col" className="px-4 py-2.5">Arrival (<span className="font-mono">AT</span>)</th>
                <th scope="col" className="px-4 py-2.5">Burst (<span className="font-mono">BT</span>)</th>
                <th scope="col" className="px-4 py-2.5">First CPU (<span className="font-mono">ST</span>)</th>
                <th scope="col" className="px-4 py-2.5">Completion (<span className="font-mono">CT</span>)</th>
                <th scope="col" className="px-4 py-2.5 font-bold text-indigo-900">Turnaround (<span className="font-mono">TAT</span>)</th>
                <th scope="col" className="px-4 py-2.5 font-bold text-indigo-900">Waiting (<span className="font-mono">WT</span>)</th>
                <th scope="col" className="px-4 py-2.5 font-bold text-indigo-900">Response (<span className="font-mono">RT</span>)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              {processes.map((p) => (
                <tr key={p.pid} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{p.pid}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.arrival}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.burst}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.start}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.completion}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{p.turnaround}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{p.waiting}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{p.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
