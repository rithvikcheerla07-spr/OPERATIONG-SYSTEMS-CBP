import React from 'react';
import { X, BookOpen, Cpu, RotateCcw, Activity, Layers, CheckCircle2 } from 'lucide-react';

interface EducationalHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalHelpModal: React.FC<EducationalHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-slate-900">
                Operating Systems Lab Reference Manual
              </h2>
              <p className="text-xs text-slate-500">Scheduling algorithms, state machine invariants, and Linux engine contract</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Scheduling Rules */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              1. Scheduling Rules & Algorithms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-900">FCFS (First-Come, First-Served)</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Processes are dispatched in the exact chronological order of their arrival. Non-preemptive: once the CPU is assigned to a process, it executes until completion.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-900">SJF (Shortest Job First)</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Non-preemptive algorithm that selects the waiting process with the smallest total CPU burst. Minimizes average waiting time across non-preemptive workloads.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-900">Round Robin (RR)</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preemptive time-sliced algorithm. Each process runs for up to a designated quantum <code className="font-mono text-indigo-700 font-semibold">q</code>. If unfinished, it is preempted back to the ready queue.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold">Deterministic Tie-Breaking & Simultaneous Events:</div>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li><strong>Arrival & Burst Ties:</strong> Lower alphanumeric PID is scheduled first (e.g. P1 before P2).</li>
                <li><strong>Simultaneous Quantum Expiration & Arrival:</strong> If a new process arrives at the exact instant a running process expires its quantum, the newly arriving process is queued <em>before</em> the preempted process.</li>
                <li><strong>Early Release:</strong> If a process completes before its quantum has fully elapsed, it releases the CPU immediately at that exact timestamp.</li>
                <li><strong>CPU Idle:</strong> When no processes are in the ready queue and remaining processes have future arrival times, the CPU transitions to an idle state until the next arrival.</li>
              </ul>
            </div>
          </section>

          {/* 4-State Model */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              2. Simulated Process State Model
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This simulator models standard operating system lifecycle states without I/O blocking. The <span className="font-mono font-semibold">WAITING</span> (blocked on I/O) state is deliberately omitted as a simplification for pure CPU burst analysis.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                <div className="font-mono text-xs font-bold text-slate-700">[NEW]</div>
                <div className="font-medium text-slate-900 text-xs mt-1">Not Arrived</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Simulation time &lt; arrival time.</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="font-mono text-xs font-bold text-amber-800">[READY]</div>
                <div className="font-medium text-amber-900 text-xs mt-1">Ready Queue</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Waiting for CPU assignment.</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="font-mono text-xs font-bold text-emerald-800">[RUN]</div>
                <div className="font-medium text-emerald-900 text-xs mt-1">Running on CPU</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Currently executing on core.</div>
              </div>
              <div className="p-3 bg-slate-200/80 rounded-lg border border-slate-300">
                <div className="font-mono text-xs font-bold text-slate-800">[DONE]</div>
                <div className="font-medium text-slate-900 text-xs mt-1">Terminated</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Burst execution completed.</div>
              </div>
            </div>
          </section>

          {/* Metric Formulas */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              3. Performance Metric Formulas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">Turnaround Time (TAT):</span>
                <div className="font-mono text-slate-700 mt-1 bg-white p-1.5 rounded border border-slate-200">
                  Turnaround = Completion Time - Arrival Time
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">Waiting Time (WT):</span>
                <div className="font-mono text-slate-700 mt-1 bg-white p-1.5 rounded border border-slate-200">
                  Waiting = Turnaround Time - Burst Time
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">Response Time (RT):</span>
                <div className="font-mono text-slate-700 mt-1 bg-white p-1.5 rounded border border-slate-200">
                  Response = First CPU Start Time - Arrival Time
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">CPU Utilization & Context Switches:</span>
                <div className="font-mono text-slate-700 mt-1 bg-white p-1.5 rounded border border-slate-200">
                  Utilization = (Total Burst / Total Elapsed Time) × 100%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Context switches count changes between consecutive non-idle processes.
                </div>
              </div>
            </div>
          </section>

          {/* State-Aware Replay USP */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-600" />
              4. State-Aware Replay Invariant
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unlike ordinary simulators that merely slide a marker over a pre-rendered static diagram, every scheduling event in this system encapsulates a <strong>full system snapshot</strong> recorded by the C engine. Moving Previous, Next, or clicking any event directly restores:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Exact CPU Core allocation</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Exact ordered Ready Queue</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>State & remaining burst per process</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
