import React from 'react';
import { Plus, Trash2, RotateCw, GitCompare, Play, AlertCircle, Info } from 'lucide-react';
import { ProcessInput, SupportedAlgorithm } from '../types.js';

interface ProcessInputTableProps {
  algorithm: SupportedAlgorithm;
  onAlgorithmChange: (algo: SupportedAlgorithm) => void;
  quantum: number;
  onQuantumChange: (q: number) => void;
  processes: ProcessInput[];
  onProcessesChange: (procs: ProcessInput[]) => void;
  onRunSimulation: () => void;
  onCompareAlgorithms: () => void;
  isSimulating: boolean;
  isComparing: boolean;
}

export const ProcessInputTable: React.FC<ProcessInputTableProps> = ({
  algorithm,
  onAlgorithmChange,
  quantum,
  onQuantumChange,
  processes,
  onProcessesChange,
  onRunSimulation,
  onCompareAlgorithms,
  isSimulating,
  isComparing,
}) => {
  const handleAddProcess = () => {
    if (processes.length >= 10) return;
    const nextNum = processes.length + 1;
    let nextPid = `P${nextNum}`;
    let counter = nextNum;
    while (processes.some((p) => p.pid === nextPid)) {
      counter++;
      nextPid = `P${counter}`;
    }
    const lastArrival = processes.length > 0 ? processes[processes.length - 1].arrival : 0;
    onProcessesChange([
      ...processes,
      {
        pid: nextPid,
        arrival: lastArrival + 1,
        burst: 3,
      },
    ]);
  };

  const handleRemoveProcess = (index: number) => {
    if (processes.length <= 1) return;
    const updated = processes.filter((_, i) => i !== index);
    onProcessesChange(updated);
  };

  const handleUpdateProcess = (index: number, field: keyof ProcessInput, val: any) => {
    const updated = [...processes];
    if (field === 'pid') {
      updated[index] = { ...updated[index], pid: val };
    } else {
      const num = parseInt(val, 10);
      updated[index] = { ...updated[index], [field]: isNaN(num) ? 0 : num };
    }
    onProcessesChange(updated);
  };

  const handleLoadSample = () => {
    onProcessesChange([
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ]);
  };

  // Validation checks
  const pidRegex = /^[A-Za-z0-9_-]{1,8}$/;
  const pids = processes.map((p) => p.pid);
  const hasDuplicatePids = new Set(pids).size !== pids.length;

  const errors: string[] = [];
  if (processes.length < 1) errors.push('At least one process is required.');
  if (processes.length > 10) errors.push('A maximum of 10 processes is supported.');
  if (hasDuplicatePids) errors.push('Process IDs must be unique.');

  for (const p of processes) {
    if (!pidRegex.test(p.pid)) {
      errors.push(`PID "${p.pid}" is invalid (must be 1-8 letters/numbers/hyphens).`);
      break;
    }
    if (p.arrival < 0 || p.arrival > 1000) {
      errors.push(`Arrival time for ${p.pid} must be between 0 and 1000.`);
      break;
    }
    if (p.burst < 1 || p.burst > 1000) {
      errors.push(`Burst time for ${p.pid} must be between 1 and 1000.`);
      break;
    }
  }

  if (algorithm === 'RR' && (quantum < 1 || quantum > 100)) {
    errors.push('Time quantum for Round Robin must be between 1 and 100.');
  }

  const isValid = errors.length === 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Configuration Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Workload Configuration
          </h2>
          <p className="text-xs text-slate-500">Define scheduling policy, time slicing, and process arrival parameters</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Load lab syllabus reference set: P1(0,4), P2(1,3), P3(2,2)"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Load Sample (P1..P3)</span>
          </button>
        </div>
      </div>

      {/* Algorithm Selection & Quantum */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Scheduling Algorithm
          </label>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 w-full">
            <button
              type="button"
              onClick={() => onAlgorithmChange('FCFS')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                algorithm === 'FCFS'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FCFS
            </button>
            <button
              type="button"
              onClick={() => onAlgorithmChange('SJF')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                algorithm === 'SJF'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SJF (Non-preemptive)
            </button>
            <button
              type="button"
              onClick={() => onAlgorithmChange('RR')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                algorithm === 'RR'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Round Robin
            </button>
          </div>
        </div>

        {algorithm === 'RR' && (
          <div className="animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Time Quantum (<code className="font-mono text-indigo-600">q</code>)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={quantum}
                onChange={(e) => onQuantumChange(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500">time units per slice</span>
            </div>
          </div>
        )}
      </div>

      {/* Process Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3 w-16">#</th>
              <th scope="col" className="px-4 py-3">Process ID (PID)</th>
              <th scope="col" className="px-4 py-3">Arrival Time (<span className="font-mono">t</span>)</th>
              <th scope="col" className="px-4 py-3">Burst Time (<span className="font-mono">ms</span>)</th>
              <th scope="col" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {processes.map((proc, idx) => {
              const isDuplicate = pids.filter((p) => p === proc.pid).length > 1;
              const isInvalidPid = !pidRegex.test(proc.pid);
              return (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      maxLength={8}
                      value={proc.pid}
                      onChange={(e) => handleUpdateProcess(idx, 'pid', e.target.value)}
                      className={`w-28 px-2.5 py-1 text-xs font-mono rounded border ${
                        isDuplicate || isInvalidPid
                          ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-red-400'
                          : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                      } focus:outline-none focus:ring-1`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={proc.arrival}
                      onChange={(e) => handleUpdateProcess(idx, 'arrival', e.target.value)}
                      className="w-24 px-2.5 py-1 text-xs font-mono rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={proc.burst}
                      onChange={(e) => handleUpdateProcess(idx, 'burst', e.target.value)}
                      className="w-24 px-2.5 py-1 text-xs font-mono rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={processes.length <= 1}
                      onClick={() => handleRemoveProcess(idx)}
                      aria-label={`Remove process ${proc.pid}`}
                      className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handleAddProcess}
          disabled={processes.length >= 10}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer w-fit"
        >
          <Plus className="w-3.5 h-3.5 text-slate-600" />
          <span>Add Process ({processes.length}/10)</span>
        </button>

        {errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCompareAlgorithms}
            disabled={!isValid || isSimulating || isComparing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
          >
            <GitCompare className="w-4 h-4 text-slate-500" />
            <span>{isComparing ? 'Comparing...' : 'Compare Algorithms'}</span>
          </button>

          <button
            type="button"
            onClick={onRunSimulation}
            disabled={!isValid || isSimulating || isComparing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Running C Engine...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
