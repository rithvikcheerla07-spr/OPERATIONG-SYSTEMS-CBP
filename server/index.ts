import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateSimulationRequest } from './validation.ts';
import { runEngine, getEngineStatus } from './engine-runner.ts';
import type { ComparisonResult } from './types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Basic security & parsing
app.use(express.json({ limit: '100kb' }));

// CORS configuration
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST'],
  })
);

// Simple rate limiter: max 120 requests per minute per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(clientIp);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
    });
  }

  entry.count++;
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const status = getEngineStatus();
  res.json({
    status: 'ok',
    engineAvailable: status.available,
    engineMode: status.mode,
    enginePath: status.path,
    timestamp: new Date().toISOString(),
  });
});

// Simulation endpoint
app.post('/api/simulate', async (req: Request, res: Response) => {
  const validation = validateSimulationRequest(req.body);

  if (!validation.valid) {
    if (validation.technicalError) {
      console.warn(`[API /simulate] Validation failed: ${validation.technicalError}`);
    }
    return res.status(400).json({
      error: validation.userMessage,
    });
  }

  try {
    const result = await runEngine(validation.data);
    return res.json(result);
  } catch (err: any) {
    if (err && err.technicalError) {
      console.error(`[API /simulate] Engine error: ${err.technicalError}`);
    } else {
      console.error('[API /simulate] Unexpected execution error:', err);
    }
    return res.status(500).json({
      error: err?.userMessage || 'The simulation service is currently unavailable. Please try again shortly.',
    });
  }
});

// Compare all 3 algorithms on the same input
app.post('/api/compare', async (req: Request, res: Response) => {
  const baseReq = { ...req.body, algorithm: 'FCFS' };
  const validation = validateSimulationRequest(baseReq);

  if (!validation.valid) {
    if (validation.technicalError) {
      console.warn(`[API /compare] Validation failed: ${validation.technicalError}`);
    }
    return res.status(400).json({
      error: validation.userMessage,
    });
  }

  const requestedQuantum =
    typeof req.body.quantum === 'number' && Number.isInteger(req.body.quantum) && req.body.quantum >= 1 && req.body.quantum <= 100
      ? req.body.quantum
      : 2;

  const procs = validation.data.processes;

  try {
    const [fcfsRes, sjfRes, rrRes] = await Promise.all([
      runEngine({ algorithm: 'FCFS', quantum: 1, processes: procs }),
      runEngine({ algorithm: 'SJF', quantum: 1, processes: procs }),
      runEngine({ algorithm: 'RR', quantum: requestedQuantum, processes: procs }),
    ]);

    const comparison: ComparisonResult = {
      FCFS: fcfsRes,
      SJF: sjfRes,
      RR: rrRes,
    };

    return res.json(comparison);
  } catch (err: any) {
    if (err && err.technicalError) {
      console.error(`[API /compare] Engine error: ${err.technicalError}`);
    } else {
      console.error('[API /compare] Unexpected compare error:', err);
    }
    return res.status(500).json({
      error: err?.userMessage || 'Failed to compare scheduling algorithms. Please try again shortly.',
    });
  }
});

// Static assets serving in production
const possibleDistPaths = [
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'dist'),
];

let distDir = '';
for (const p of possibleDistPaths) {
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    distDir = p;
    break;
  }
}

if (distDir) {
  console.log(`[Server] Serving static production build from ${distDir}`);
  app.use(express.static(distDir));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Startup status check
const status = getEngineStatus();
if (status.available) {
  console.log(`[Server Startup] C scheduling engine binary verified at: ${status.path}`);
} else {
  console.log(
    `[Server Startup] Native C binary not found; using built-in self-contained portable engine.`
  );
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] OS Scheduling API server listening on http://0.0.0.0:${PORT}`);
});

export default app;
