import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import photoRoutes from './routes/photoRoutes';
import tripRoutes from './routes/tripRoutes';
import testRoutes from './routes/testRoutes';
import { authenticate } from './middlewares/authMiddleware';

const app = express();

// Set CORS to explicitly allow localhost:5173 in development
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/photos', authenticate, photoRoutes);
app.use('/api/trips', tripRoutes);

// Test routes — the router itself guards against non-development requests
// (always mounted so the NODE_ENV guard works at request-time, not import-time)
app.use('/api/test', testRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err.message, err.stack);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;

