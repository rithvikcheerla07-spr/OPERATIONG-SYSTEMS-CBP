import React, { useState, useEffect, useCallback } from 'react';
import {
  ProcessInput,
  SupportedAlgorithm,
  SimulationResult,
  ComparisonResult,
} from './types.ts';
import { LandingHero } from './components/LandingHero.tsx';
import { ProcessInputTable } from './components/ProcessInputTable.tsx';
import { GanttChart } from './components/GanttChart.tsx';
import { ReplayControls } from './components/ReplayControls.tsx';
import { StateInspector } from './components/StateInspector.tsx';
import { EventTimeline } from './components/EventTimeline.tsx';
import { MetricsSummary } from './components/MetricsSummary.tsx';
import { AlgorithmComparison } from './components/AlgorithmComparison.tsx';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [algorithm, setAlgorithm] = useState<SupportedAlgorithm>('FCFS');
  const [quantum, setQuantum] = useState<number>(2);
  const [processes, setProcesses] = useState<ProcessInput[]>([
    { pid: 'P1', arrival: 0, burst: 4 },
    { pid: 'P2', arrival: 1, burst: 3 },
    { pid: 'P3', arrival: 2, burst: 2 },
  ]);

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Execute simulation against real backend & C engine
  const runSimulation = useCallback(
    async (
      customAlgo?: SupportedAlgorithm,
      customQuantum?: number,
      customProcs?: ProcessInput[]
    ) => {
      const activeAlgo = customAlgo || algorithm;
      const activeQuantum = customQuantum !== undefined ? customQuantum : quantum;
      const activeProcs = customProcs || processes;

      setIsSimulating(true);
      setErrorMessage(null);

      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            algorithm: activeAlgo,
            quantum: activeQuantum,
            processes: activeProcs,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'The simulation service is currently unavailable. Please try again shortly.');
        }

        setSimulationResult(data);
        setCurrentEventIndex(0);
        setComparisonResult(null); // clear comparison if running single simulation
      } catch (err: any) {
        setErrorMessage(
          err.message || 'The simulation service is currently unavailable. Please try again shortly.'
        );
      } finally {
        setIsSimulating(false);
      }
    },
    [algorithm, quantum, processes]
  );

  // Compare all 3 algorithms on identical process set
  const runComparison = useCallback(async () => {
    setIsComparing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantum,
          processes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'The simulation service is currently unavailable. Please try again shortly.');
      }

      setComparisonResult(data);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'The simulation service is currently unavailable. Please try again shortly.'
      );
    } finally {
      setIsComparing(false);
    }
  }, [quantum, processes]);

  // Initial load runs default sample simulation
  useEffect(() => {
    runSimulation('FCFS', 2, [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ]);
  }, []);

  // When user changes algorithm, rerun simulation automatically to reset history to event 0
  const handleAlgorithmChange = (newAlgo: SupportedAlgorithm) => {
    setAlgorithm(newAlgo);
    runSimulation(newAlgo, quantum, processes);
  };

  const handleQuantumChange = (newQuantum: number) => {
    setQuantum(newQuantum);
    runSimulation(algorithm, newQuantum, processes);
  };

  const handleProcessesChange = (newProcs: ProcessInput[]) => {
    setProcesses(newProcs);
  };

  const currentEvent = simulationResult?.events[currentEventIndex] || null;
  const currentSnapshot = currentEvent?.snapshot || null;
  const currentTime = currentEvent?.time ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Educational Landing Hero */}
      <LandingHero
        onStartSimulation={() => runSimulation()}
        isSimulating={isSimulating}
      />

      {/* Main Simulation Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Friendly User Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-red-900">Simulation Notice</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Process Inputs & Configuration Section */}
        <ProcessInputTable
          algorithm={algorithm}
          onAlgorithmChange={handleAlgorithmChange}
          quantum={quantum}
          onQuantumChange={handleQuantumChange}
          processes={processes}
          onProcessesChange={handleProcessesChange}
          onRunSimulation={() => runSimulation()}
          onCompareAlgorithms={runComparison}
          isSimulating={isSimulating}
          isComparing={isComparing}
        />

        {/* Comparison Matrix View (if toggled) */}
        {comparisonResult && (
          <AlgorithmComparison
            comparison={comparisonResult}
            onClose={() => setComparisonResult(null)}
            quantum={quantum}
          />
        )}

        {/* Interactive Gantt Chart with Synchronized Marker */}
        {simulationResult && (
          <GanttChart
            segments={simulationResult.gantt}
            totalTime={simulationResult.metrics.totalTime}
            currentTime={currentTime}
            onTimeClick={(t) => {
              // Find the earliest event matching or closest to time t
              const idx = simulationResult.events.findIndex((e) => e.time >= t);
              if (idx !== -1) {
                setCurrentEventIndex(idx);
              }
            }}
          />
        )}

        {/* State-Aware Replay Controls (Previous, Next, Reset, Scrubber, Auto-play) */}
        {simulationResult && simulationResult.events.length > 0 && (
          <ReplayControls
            events={simulationResult.events}
            currentIndex={currentEventIndex}
            onSelectEvent={setCurrentEventIndex}
          />
        )}

        {/* System State Inspector & Event Timeline (Restored per event) */}
        {simulationResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Process State Inspector: Restores CPU, Ready Queue, PCB States */}
            <div className="lg:col-span-7 space-y-6">
              <StateInspector
                snapshot={currentSnapshot}
                processes={processes}
                currentTime={currentTime}
              />
            </div>

            {/* Event Timeline Stream: Clickable events that restore state */}
            <div className="lg:col-span-5">
              <EventTimeline
                events={simulationResult.events}
                currentIndex={currentEventIndex}
                onSelectEvent={setCurrentEventIndex}
              />
            </div>
          </div>
        )}

        {/* Performance Metrics & Formulas */}
        {simulationResult && (
          <MetricsSummary
            metrics={simulationResult.metrics}
            algorithm={simulationResult.algorithm}
            quantum={simulationResult.quantum}
          />
        )}
      </main>

      {/* Academic Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Operating Systems with Linux Laboratory</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Deterministic Execution Replay Engine</span>
          </div>

          <div className="flex items-center gap-3">
            <span>POSIX C99 &amp; Linux Process Semantics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
