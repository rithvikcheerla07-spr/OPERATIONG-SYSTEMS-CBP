import type { SimulationRequest, SimulationResult } from './types.ts';

export interface ValidationSuccess {
  valid: true;
  data: SimulationRequest;
}

export interface ValidationFailure {
  valid: false;
  userMessage: string;
  technicalError?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const PID_REGEX = /^[A-Za-z0-9_-]{1,8}$/;

export function validateSimulationRequest(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      userMessage: 'Please check your simulation settings and try again.',
      technicalError: 'Payload must be a non-null JSON object.',
    };
  }

  const { algorithm, quantum, processes } = input;

  if (algorithm !== 'FCFS' && algorithm !== 'SJF' && algorithm !== 'RR') {
    return {
      valid: false,
      userMessage: 'Please select a valid CPU scheduling algorithm (FCFS, SJF, or Round Robin).',
      technicalError: `Invalid algorithm received: ${String(algorithm)}`,
    };
  }

  let parsedQuantum = 1;
  if (algorithm === 'RR') {
    if (
      typeof quantum !== 'number' ||
      !Number.isInteger(quantum) ||
      quantum < 1 ||
      quantum > 100
    ) {
      return {
        valid: false,
        userMessage: 'Please enter a whole number time quantum between 1 and 100 for Round Robin.',
        technicalError: `Invalid quantum received: ${String(quantum)}`,
      };
    }
    parsedQuantum = quantum;
  }

  if (!Array.isArray(processes) || processes.length < 1 || processes.length > 10) {
    return {
      valid: false,
      userMessage: 'Please specify between 1 and 10 processes.',
      technicalError: `Invalid process list count: ${Array.isArray(processes) ? processes.length : typeof processes}`,
    };
  }

  const seenPids = new Set<string>();
  const validatedProcs = [];

  for (let i = 0; i < processes.length; i++) {
    const p = processes[i];
    if (!p || typeof p !== 'object') {
      return {
        valid: false,
        userMessage: 'Please check your process details and try again.',
        technicalError: `Process at index ${i} is not an object.`,
      };
    }

    const { pid, arrival, burst } = p;

    if (typeof pid !== 'string' || !PID_REGEX.test(pid)) {
      return {
        valid: false,
        userMessage: 'Each process ID must be 1 to 8 letters, numbers, hyphens or underscores.',
        technicalError: `Invalid PID "${String(pid)}" at index ${i}.`,
      };
    }

    if (seenPids.has(pid)) {
      return {
        valid: false,
        userMessage: `Process ID "${pid}" is duplicated. Each process must have a unique ID.`,
        technicalError: `Duplicate PID "${pid}".`,
      };
    }
    seenPids.add(pid);

    if (
      typeof arrival !== 'number' ||
      !Number.isInteger(arrival) ||
      arrival < 0 ||
      arrival > 1000
    ) {
      return {
        valid: false,
        userMessage: `Arrival time for process "${pid}" must be a whole number between 0 and 1000.`,
        technicalError: `Invalid arrival time ${String(arrival)} for PID "${pid}".`,
      };
    }

    if (
      typeof burst !== 'number' ||
      !Number.isInteger(burst) ||
      burst < 1 ||
      burst > 1000
    ) {
      return {
        valid: false,
        userMessage: `Burst time for process "${pid}" must be a whole number between 1 and 1000.`,
        technicalError: `Invalid burst time ${String(burst)} for PID "${pid}".`,
      };
    }

    validatedProcs.push({
      pid,
      arrival,
      burst,
    });
  }

  return {
    valid: true,
    data: {
      algorithm,
      quantum: parsedQuantum,
      processes: validatedProcs,
    },
  };
}

export function validateEngineOutput(output: any): output is SimulationResult {
  if (!output || typeof output !== 'object') return false;
  if (typeof output.algorithm !== 'string') return false;
  if (typeof output.quantum !== 'number') return false;
  if (!Array.isArray(output.gantt)) return false;
  if (!output.metrics || typeof output.metrics !== 'object') return false;
  if (!Array.isArray(output.metrics.processes)) return false;
  if (!output.metrics.averages || typeof output.metrics.averages !== 'object') return false;
  if (typeof output.metrics.cpuUtilization !== 'number') return false;
  if (typeof output.metrics.contextSwitches !== 'number') return false;
  if (typeof output.metrics.totalTime !== 'number') return false;
  if (!Array.isArray(output.events)) return false;

  for (const ev of output.events) {
    if (typeof ev.index !== 'number' || typeof ev.time !== 'number') return false;
    if (typeof ev.type !== 'string' || typeof ev.description !== 'string') return false;
    if (!ev.snapshot || typeof ev.snapshot !== 'object') return false;
    if (!Array.isArray(ev.snapshot.readyQueue)) return false;
    if (!ev.snapshot.states || typeof ev.snapshot.states !== 'object') return false;
    if (!ev.snapshot.remaining || typeof ev.snapshot.remaining !== 'object') return false;
  }

  return true;
}
