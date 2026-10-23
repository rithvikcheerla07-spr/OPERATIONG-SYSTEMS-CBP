/**
 * Portable, self-contained CPU scheduling simulation engine.
 * Fully mirrors the POSIX C engine contract:
 * - FCFS, non-preemptive SJF, Round Robin
 * - Strict tie-breaking by lower PID
 * - Deterministic simultaneous event ordering: newly arriving processes are enqueued
 *   BEFORE a preempted process at the exact instant a quantum expires.
 * - Full system snapshots per event (running, readyQueue, states, remaining).
 * - Exact metric formulas (waiting, turnaround, response, CPU utilization, context switches).
 */

import type {
  SimulationRequest,
  SimulationResult,
  ProcessState,
  SimEvent,
  GanttSegment,
  ProcessMetrics,
} from './types.ts';

interface InternalProc {
  pid: string;
  arrival: number;
  burst: number;
  remaining: number;
  startTime: number;
  completionTime: number;
  waitingTime: number;
  turnaroundTime: number;
  responseTime: number;
  inputIndex: number;
  state: ProcessState;
}

export function runSelfContainedSimulation(request: SimulationRequest): SimulationResult {
  const { algorithm, quantum = 1, processes: rawProcesses } = request;

  // Initialize process control blocks
  const procs: InternalProc[] = rawProcesses.map((p, index) => ({
    pid: p.pid,
    arrival: p.arrival,
    burst: p.burst,
    remaining: p.burst,
    startTime: -1,
    completionTime: 0,
    waitingTime: 0,
    turnaroundTime: 0,
    responseTime: 0,
    inputIndex: index,
    state: 'NEW',
  }));

  const numProcs = procs.length;
  let currentRunningIdx = -1;
  const readyQueue: number[] = [];
  const gantt: GanttSegment[] = [];
  const events: SimEvent[] = [];

  const addGanttSegment = (pid: string, isIdle: boolean, start: number, end: number) => {
    if (start >= end) return;
    if (
      gantt.length > 0 &&
      gantt[gantt.length - 1].isIdle === isIdle &&
      gantt[gantt.length - 1].pid === pid &&
      gantt[gantt.length - 1].end === start
    ) {
      gantt[gantt.length - 1].end = end;
      return;
    }
    gantt.push({ pid, start, end, isIdle });
  };

  const captureSnapshot = () => {
    const statesMap: Record<string, ProcessState> = {};
    const remainingMap: Record<string, number> = {};

    for (const p of procs) {
      statesMap[p.pid] = p.state;
      remainingMap[p.pid] = p.remaining;
    }

    return {
      running: currentRunningIdx >= 0 ? procs[currentRunningIdx].pid : null,
      readyQueue: readyQueue.map((idx) => procs[idx].pid),
      states: statesMap,
      remaining: remainingMap,
    };
  };

  const recordEvent = (
    time: number,
    type: SimEvent['type'],
    procPid: string | null,
    description: string
  ) => {
    events.push({
      index: events.length,
      time,
      type,
      process: procPid,
      description,
      snapshot: captureSnapshot(),
    });
  };

  const tieBreakCompare = (a: number, b: number): number => {
    const c = procs[a].pid.localeCompare(procs[b].pid);
    if (c !== 0) return c;
    return procs[a].inputIndex - procs[b].inputIndex;
  };

  const handleArrivals = (currentTime: number) => {
    const arriving: number[] = [];
    for (let i = 0; i < numProcs; i++) {
      if (procs[i].arrival === currentTime && procs[i].state === 'NEW') {
        arriving.push(i);
      }
    }

    arriving.sort(tieBreakCompare);

    for (const idx of arriving) {
      procs[idx].state = 'READY';
      readyQueue.push(idx);
      recordEvent(
        currentTime,
        'ARRIVAL',
        procs[idx].pid,
        `${procs[idx].pid} arrives (burst: ${procs[idx].burst})`
      );
    }
  };

  const pickNextSjf = (): number => {
    if (readyQueue.length === 0) return -1;
    let bestPos = 0;
    let bestIdx = readyQueue[0];

    for (let i = 1; i < readyQueue.length; i++) {
      const candidate = readyQueue[i];
      if (procs[candidate].burst < procs[bestIdx].burst) {
        bestIdx = candidate;
        bestPos = i;
      } else if (procs[candidate].burst === procs[bestIdx].burst) {
        if (tieBreakCompare(candidate, bestIdx) < 0) {
          bestIdx = candidate;
          bestPos = i;
        }
      }
    }

    readyQueue.splice(bestPos, 1);
    return bestIdx;
  };

  let currentTime = 0;
  let completedCount = 0;

  // Initial arrivals at t = 0
  handleArrivals(0);

  while (completedCount < numProcs) {
    if (currentRunningIdx === -1) {
      if (readyQueue.length === 0) {
        // Find next arrival time
        let nextArr = -1;
        for (let i = 0; i < numProcs; i++) {
          if (procs[i].state === 'NEW') {
            if (nextArr === -1 || procs[i].arrival < nextArr) {
              nextArr = procs[i].arrival;
            }
          }
        }

        if (nextArr > currentTime) {
          recordEvent(currentTime, 'CPU_IDLE', null, 'CPU is idle waiting for process arrival');
          addGanttSegment('IDLE', true, currentTime, nextArr);
          currentTime = nextArr;
          handleArrivals(currentTime);
        }
        continue;
      }

      // Pick process
      let nextProc = -1;
      if (algorithm === 'SJF') {
        nextProc = pickNextSjf();
      } else {
        nextProc = readyQueue.shift()!;
      }

      currentRunningIdx = nextProc;
      procs[currentRunningIdx].state = 'RUNNING';
      if (procs[currentRunningIdx].startTime === -1) {
        procs[currentRunningIdx].startTime = currentTime;
        procs[currentRunningIdx].responseTime = currentTime - procs[currentRunningIdx].arrival;
      }

      recordEvent(
        currentTime,
        'CPU_ASSIGNED',
        procs[currentRunningIdx].pid,
        `CPU assigned to ${procs[currentRunningIdx].pid} (remaining: ${procs[currentRunningIdx].remaining})`
      );
    }

    const runIdx = currentRunningIdx;
    let timeSlice = 0;

    if (algorithm === 'RR') {
      timeSlice = Math.min(procs[runIdx].remaining, quantum);
    } else {
      timeSlice = procs[runIdx].remaining;
    }

    const startSlice = currentTime;
    const endSlice = currentTime + timeSlice;

    // Step time forward, handling any arrivals that occur during the slice
    let t = startSlice;
    while (t < endSlice) {
      t++;
      procs[runIdx].remaining--;
      if (t < endSlice) {
        handleArrivals(t);
      }
    }

    currentTime = endSlice;
    addGanttSegment(procs[runIdx].pid, false, startSlice, endSlice);

    if (procs[runIdx].remaining === 0) {
      procs[runIdx].state = 'TERMINATED';
      procs[runIdx].completionTime = currentTime;
      procs[runIdx].turnaroundTime = currentTime - procs[runIdx].arrival;
      procs[runIdx].waitingTime = procs[runIdx].turnaroundTime - procs[runIdx].burst;
      completedCount++;

      handleArrivals(currentTime);

      currentRunningIdx = -1;
      recordEvent(
        currentTime,
        'PROCESS_COMPLETED',
        procs[runIdx].pid,
        `${procs[runIdx].pid} completed execution (turnaround: ${procs[runIdx].turnaroundTime}, waiting: ${procs[runIdx].waitingTime})`
      );
    } else {
      // Quantum expired: newly arriving processes at this instant must be queued BEFORE the preempted process
      handleArrivals(currentTime);

      procs[runIdx].state = 'READY';
      readyQueue.push(runIdx);
      currentRunningIdx = -1;

      recordEvent(
        currentTime,
        'QUANTUM_EXPIRED',
        procs[runIdx].pid,
        `Quantum expired for ${procs[runIdx].pid} (remaining: ${procs[runIdx].remaining})`
      );
    }
  }

  recordEvent(currentTime, 'SIMULATION_COMPLETE', null, `Simulation complete at time ${currentTime}`);

  // Calculate metrics
  const totalTime = gantt.length > 0 ? gantt[gantt.length - 1].end : 0;
  const totalBurst = procs.reduce((acc, p) => acc + p.burst, 0);
  const cpuUtilization = totalTime > 0 ? Number(((totalBurst / totalTime) * 100).toFixed(2)) : 0;

  let contextSwitches = 0;
  let lastNonIdle: string | null = null;
  for (const seg of gantt) {
    if (!seg.isIdle) {
      if (lastNonIdle !== null && lastNonIdle !== seg.pid) {
        contextSwitches++;
      }
      lastNonIdle = seg.pid;
    }
  }

  const sumWaiting = procs.reduce((acc, p) => acc + p.waitingTime, 0);
  const sumTurnaround = procs.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const sumResponse = procs.reduce((acc, p) => acc + p.responseTime, 0);

  const avgWaiting = numProcs > 0 ? Number((sumWaiting / numProcs).toFixed(2)) : 0;
  const avgTurnaround = numProcs > 0 ? Number((sumTurnaround / numProcs).toFixed(2)) : 0;
  const avgResponse = numProcs > 0 ? Number((sumResponse / numProcs).toFixed(2)) : 0;

  const resultProcesses: ProcessMetrics[] = procs.map((p) => ({
    pid: p.pid,
    arrival: p.arrival,
    burst: p.burst,
    start: p.startTime,
    completion: p.completionTime,
    waiting: p.waitingTime,
    turnaround: p.turnaroundTime,
    response: p.responseTime,
  }));

  return {
    algorithm,
    quantum,
    gantt,
    metrics: {
      processes: resultProcesses,
      averages: {
        waiting: avgWaiting,
        turnaround: avgTurnaround,
        response: avgResponse,
      },
      cpuUtilization,
      contextSwitches,
      totalTime,
    },
    events,
  };
}
