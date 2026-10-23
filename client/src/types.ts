export type SupportedAlgorithm = 'FCFS' | 'SJF' | 'RR';

export type ProcessState = 'NEW' | 'READY' | 'RUNNING' | 'TERMINATED';

export type EventType =
  | 'ARRIVAL'
  | 'CPU_ASSIGNED'
  | 'QUANTUM_EXPIRED'
  | 'PROCESS_COMPLETED'
  | 'CPU_IDLE'
  | 'SIMULATION_COMPLETE';

export interface ProcessInput {
  pid: string;
  arrival: number;
  burst: number;
}

export interface GanttSegment {
  pid: string;
  start: number;
  end: number;
  isIdle?: boolean;
}

export interface ProcessMetrics {
  pid: string;
  arrival: number;
  burst: number;
  start: number;
  completion: number;
  waiting: number;
  turnaround: number;
  response: number;
}

export interface SystemSnapshot {
  running: string | null;
  readyQueue: string[];
  states: Record<string, ProcessState>;
  remaining: Record<string, number>;
}

export interface SimEvent {
  index: number;
  time: number;
  type: EventType;
  process: string | null;
  description: string;
  snapshot: SystemSnapshot;
}

export interface SimulationResult {
  algorithm: SupportedAlgorithm;
  quantum: number;
  gantt: GanttSegment[];
  metrics: {
    processes: ProcessMetrics[];
    averages: {
      waiting: number;
      turnaround: number;
      response: number;
    };
    cpuUtilization: number;
    contextSwitches: number;
    totalTime: number;
  };
  events: SimEvent[];
}

export interface ComparisonResult {
  FCFS: SimulationResult;
  SJF: SimulationResult;
  RR: SimulationResult;
}
