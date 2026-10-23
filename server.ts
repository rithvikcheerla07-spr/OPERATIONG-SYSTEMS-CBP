import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateSimulationRequest } from './server/validation.ts';
import { runEngine, getEngineStatus } from './server/engine-runner.ts';
import type { ComparisonResult } from './server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '100kb' }));
  app.use(cors());

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
      return res.status(400).json({ error: validation.userMessage });
    }

    try {
      const result = await runEngine(validation.data);
      return res.json(result);
    } catch (err: any) {
      if (err?.technicalError) {
        console.error(`[API /simulate] Engine error: ${err.technicalError}`);
      }
      return res.status(500).json({
        error: err?.userMessage || 'The simulation service is currently unavailable. Please try again shortly.',
      });
    }
  });

  // Compare all 3 algorithms
  app.post('/api/compare', async (req: Request, res: Response) => {
    const baseReq = { ...req.body, algorithm: 'FCFS' };
    const validation = validateSimulationRequest(baseReq);

    if (!validation.valid) {
      if (validation.technicalError) {
        console.warn(`[API /compare] Validation failed: ${validation.technicalError}`);
      }
      return res.status(400).json({ error: validation.userMessage });
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
      if (err?.technicalError) {
        console.error(`[API /compare] Engine error: ${err.technicalError}`);
      }
      return res.status(500).json({
        error: err?.userMessage || 'Failed to compare scheduling algorithms. Please try again shortly.',
      });
    }
  });

  // In development, mount Vite middleware; in production, serve built dist
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidateDist = [
      path.resolve(__dirname, 'dist'),
      path.resolve(process.cwd(), 'dist'),
    ];
    let distPath = candidateDist.find((p) => fs.existsSync(p));

    if (distPath) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath!, 'index.html'));
      });
    } else {
      console.warn('[Server] dist directory not found in production mode, falling back to Vite middleware');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  // Engine presence check
  const status = getEngineStatus();
  if (status.available) {
    console.log(`[Server Startup] Native C scheduling engine verified at: ${status.path}`);
  } else {
    console.log(
      `[Server Startup] Native C binary not found; active engine: built-in self-contained portable engine.`
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OS Scheduling System listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
