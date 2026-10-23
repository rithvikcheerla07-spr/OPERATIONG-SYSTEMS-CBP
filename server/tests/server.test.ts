import test from 'node:test';
import assert from 'node:assert/strict';
import { runEngine } from '../engine-runner.ts';
import { runSelfContainedSimulation } from '../self-contained-engine.ts';
import { validateSimulationRequest } from '../validation.ts';

test('Backend & Engine: FCFS scheduling matches lab specification', async () => {
  const result = await runEngine({
    algorithm: 'FCFS',
    quantum: 1,
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ],
  });

  assert.equal(result.algorithm, 'FCFS');
  assert.equal(result.metrics.averages.waiting, 2.67);
  assert.equal(result.metrics.averages.turnaround, 5.67);
  assert.equal(result.metrics.averages.response, 2.67);
  assert.equal(result.metrics.contextSwitches, 2);

  // Gantt validation: P1 0-4, P2 4-7, P3 7-9
  assert.equal(result.gantt.length, 3);
  assert.deepEqual(result.gantt[0], { pid: 'P1', start: 0, end: 4, isIdle: false });
  assert.deepEqual(result.gantt[1], { pid: 'P2', start: 4, end: 7, isIdle: false });
  assert.deepEqual(result.gantt[2], { pid: 'P3', start: 7, end: 9, isIdle: false });
});

test('Backend & Engine: SJF (non-preemptive) matches lab specification', async () => {
  const result = await runEngine({
    algorithm: 'SJF',
    quantum: 1,
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ],
  });

  assert.equal(result.algorithm, 'SJF');
  assert.equal(result.metrics.averages.waiting, 2.33);
  assert.equal(result.metrics.averages.turnaround, 5.33);
  assert.equal(result.metrics.averages.response, 2.33);
  assert.equal(result.metrics.contextSwitches, 2);

  // Gantt validation: P1 0-4, P3 4-6, P2 6-9
  assert.equal(result.gantt.length, 3);
  assert.deepEqual(result.gantt[0], { pid: 'P1', start: 0, end: 4, isIdle: false });
  assert.deepEqual(result.gantt[1], { pid: 'P3', start: 4, end: 6, isIdle: false });
  assert.deepEqual(result.gantt[2], { pid: 'P2', start: 6, end: 9, isIdle: false });
});

test('Backend & Engine: Round Robin q=2 matches lab specification and arrival tie-break rule', async () => {
  const result = await runEngine({
    algorithm: 'RR',
    quantum: 2,
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ],
  });

  assert.equal(result.algorithm, 'RR');
  assert.equal(result.quantum, 2);
  assert.equal(result.metrics.averages.waiting, 3.67);
  assert.equal(result.metrics.averages.turnaround, 6.67);
  assert.equal(result.metrics.averages.response, 1.0);
  assert.equal(result.metrics.contextSwitches, 4);

  // Gantt: P1 0-2, P2 2-4, P3 4-6, P1 6-8, P2 8-9
  assert.equal(result.gantt.length, 5);
  assert.deepEqual(result.gantt[0], { pid: 'P1', start: 0, end: 2, isIdle: false });
  assert.deepEqual(result.gantt[1], { pid: 'P2', start: 2, end: 4, isIdle: false });
  assert.deepEqual(result.gantt[2], { pid: 'P3', start: 4, end: 6, isIdle: false });
  assert.deepEqual(result.gantt[3], { pid: 'P1', start: 6, end: 8, isIdle: false });
  assert.deepEqual(result.gantt[4], { pid: 'P2', start: 8, end: 9, isIdle: false });
});

test('Self-Contained Engine: Exact parity on Round Robin benchmark', () => {
  const result = runSelfContainedSimulation({
    algorithm: 'RR',
    quantum: 2,
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ],
  });

  assert.equal(result.algorithm, 'RR');
  assert.equal(result.quantum, 2);
  assert.equal(result.metrics.averages.waiting, 3.67);
  assert.equal(result.metrics.averages.turnaround, 6.67);
  assert.equal(result.metrics.averages.response, 1.0);
  assert.equal(result.metrics.contextSwitches, 4);
});

test('Edge Case: Single process arriving at 5 with burst 3 records idle block', async () => {
  const result = await runEngine({
    algorithm: 'FCFS',
    quantum: 1,
    processes: [{ pid: 'P1', arrival: 5, burst: 3 }],
  });

  assert.equal(result.gantt.length, 2);
  assert.equal(result.gantt[0].isIdle, true);
  assert.equal(result.gantt[0].start, 0);
  assert.equal(result.gantt[0].end, 5);
  assert.equal(result.gantt[1].pid, 'P1');
  assert.equal(result.gantt[1].start, 5);
  assert.equal(result.gantt[1].end, 8);
  assert.equal(result.metrics.cpuUtilization, 37.5);
  assert.equal(result.metrics.totalTime, 8);
});

test('Validation: Rejection of invalid inputs without reaching shell', () => {
  // Burst 0
  const v1 = validateSimulationRequest({
    algorithm: 'FCFS',
    processes: [{ pid: 'P1', arrival: 0, burst: 0 }],
  });
  assert.equal(v1.valid, false);

  // Negative arrival
  const v2 = validateSimulationRequest({
    algorithm: 'FCFS',
    processes: [{ pid: 'P1', arrival: -5, burst: 4 }],
  });
  assert.equal(v2.valid, false);

  // Duplicate PID
  const v3 = validateSimulationRequest({
    algorithm: 'FCFS',
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P1', arrival: 1, burst: 2 },
    ],
  });
  assert.equal(v3.valid, false);

  // Missing or zero quantum for RR
  const v4 = validateSimulationRequest({
    algorithm: 'RR',
    quantum: 0,
    processes: [{ pid: 'P1', arrival: 0, burst: 4 }],
  });
  assert.equal(v4.valid, false);

  // More than 10 processes
  const procs11 = Array.from({ length: 11 }, (_, i) => ({
    pid: `P${i}`,
    arrival: 0,
    burst: 2,
  }));
  const v5 = validateSimulationRequest({
    algorithm: 'FCFS',
    processes: procs11,
  });
  assert.equal(v5.valid, false);
});

test('Replay Snapshot Invariants: Full snapshots, state preservation and direct lookup', async () => {
  const result = await runEngine({
    algorithm: 'RR',
    quantum: 2,
    processes: [
      { pid: 'P1', arrival: 0, burst: 4 },
      { pid: 'P2', arrival: 1, burst: 3 },
      { pid: 'P3', arrival: 2, burst: 2 },
    ],
  });

  assert(result.events.length > 5);

  // First event at t=0: P1 arrives
  const ev0 = result.events[0];
  assert.equal(ev0.time, 0);
  assert.equal(ev0.type, 'ARRIVAL');
  assert.deepEqual(ev0.snapshot.states, { P1: 'READY', P2: 'NEW', P3: 'NEW' });

  // Verify that any step lookup is pure and deterministic
  const ev3 = result.events[3];
  const snap3A = JSON.stringify(ev3.snapshot);
  const snap3B = JSON.stringify(result.events[3].snapshot);
  assert.equal(snap3A, snap3B);

  // Every snapshot must contain ALL processes in states and remaining
  for (const ev of result.events) {
    for (const pid of ['P1', 'P2', 'P3']) {
      assert(pid in ev.snapshot.states, `Missing ${pid} in states at event ${ev.index}`);
      assert(pid in ev.snapshot.remaining, `Missing ${pid} in remaining at event ${ev.index}`);
    }
  }
});
