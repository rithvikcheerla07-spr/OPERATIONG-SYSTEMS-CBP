import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { SimulationRequest, SimulationResult } from './types.ts';
import { validateEngineOutput } from './validation.ts';
import { runSelfContainedSimulation } from './self-contained-engine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getEnginePath(): string | null {
  if (process.env.ENGINE_PATH) {
    const custom = path.resolve(process.cwd(), process.env.ENGINE_PATH);
    if (fs.existsSync(custom)) return custom;
  }

  const isWindows = process.platform === 'win32';
  const binaryNames = isWindows ? ['cpu_scheduler.exe', 'cpu_scheduler'] : ['cpu_scheduler'];

  const candidateDirs = [
    path.resolve(process.cwd(), 'engine'),
    path.resolve(__dirname, '../engine'),
    path.resolve(__dirname, '../../engine'),
  ];

  for (const dir of candidateDirs) {
    for (const name of binaryNames) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export function isEngineAvailable(): boolean {
  const binaryPath = getEnginePath();
  if (!binaryPath) return false;
  try {
    const stat = fs.statSync(binaryPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export function getEngineStatus() {
  const binaryPath = getEnginePath();
  const available = isEngineAvailable();
  return {
    available,
    mode: available ? ('native' as const) : ('self-contained' as const),
    path: binaryPath,
  };
}

export function runEngine(request: SimulationRequest): Promise<SimulationResult> {
  const binaryPath = getEnginePath();

  // If native binary is not available on this machine (e.g. Windows without gcc, or uncompiled),
  // immediately use the safe self-contained simulation engine.
  if (!binaryPath || !isEngineAvailable()) {
    return Promise.resolve(runSelfContainedSimulation(request));
  }

  return new Promise((resolve) => {
    // Prepare stdin input format:
    // Line 1: <ALGO> <quantum>
    // Line 2: <n>
    // Next n lines: <pid> <arrival> <burst>
    const lines: string[] = [];
    lines.push(`${request.algorithm} ${request.quantum || 1}`);
    lines.push(`${request.processes.length}`);
    for (const p of request.processes) {
      lines.push(`${p.pid} ${p.arrival} ${p.burst}`);
    }
    const stdinData = lines.join('\n') + '\n';

    let child;
    try {
      child = spawn(binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 3000,
      });
    } catch (spawnErr) {
      console.warn('[Engine Runner] Failed to spawn native C binary, falling back to self-contained engine:', spawnErr);
      return resolve(runSelfContainedSimulation(request));
    }

    let stdoutData = '';
    let stderrData = '';
    const maxOutputBytes = 5 * 1024 * 1024; // 5MB cap
    let outputExceeded = false;

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutData += chunk.toString('utf-8');
      if (stdoutData.length > maxOutputBytes) {
        outputExceeded = true;
        child.kill();
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrData += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      console.warn('[Engine Runner] Child process error, falling back to self-contained engine:', err.message);
      resolve(runSelfContainedSimulation(request));
    });

    child.on('close', (code: number | null, signal: string | null) => {
      if (outputExceeded || signal || code !== 0) {
        console.warn(`[Engine Runner] Native engine exit issue (code=${code}, signal=${signal}), falling back to self-contained engine.`);
        return resolve(runSelfContainedSimulation(request));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (!validateEngineOutput(parsed)) {
          console.warn('[Engine Runner] Native output failed schema check, falling back to self-contained engine.');
          return resolve(runSelfContainedSimulation(request));
        }
        resolve(parsed);
      } catch (parseErr) {
        console.warn('[Engine Runner] Native JSON parse failed, falling back to self-contained engine.');
        resolve(runSelfContainedSimulation(request));
      }
    });

    child.stdin.write(stdinData);
    child.stdin.end();
  });
}
