/**
 * testRoutes.ts
 *
 * DEV-ONLY diagnostic routes.  These are mounted in app.ts only when
 * NODE_ENV === 'development'.  They intentionally bypass Google token
 * verification so we can drive the login → upload → fetch flow from a
 * plain Node.js script without needing a live browser session.
 *
 * Endpoints exposed:
 *   POST /api/test/auth        – returns a JWT for a seeded test user
 *   POST /api/test/cloudinary  – uploads an image URL to Cloudinary (no auth)
 *   GET  /api/test/health      – quick sanity-check (DB + Cloudinary config)
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import { generateToken } from '../utils/jwt';


const router = Router();

// ── Guard: reject all requests when not in development ────────────────────────
router.use((_req: Request, res: Response, next) => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Test routes are disabled outside development.' });
    return;
  }
  next();
});

// ── GET /api/test/health ──────────────────────────────────────────────────────
// Returns DB connection state + whether Cloudinary credentials are configured.
router.get('/health', async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected 1=connected 2=connecting 3=disconnecting
  const dbStateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown';

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: { state: dbStateLabel, ready: dbState === 1 },
    cloudinary: { configured: cloudinaryConfigured },
  });
});

// ── POST /api/test/auth ───────────────────────────────────────────────────────
// Creates (or finds) a fixed test user, skipping Google token verification.
// Returns the same shape as POST /api/auth/google so the test script can
// use the token with the real photo routes.
router.post('/auth', async (_req: Request, res: Response): Promise<void> => {
  try {
    const TEST_GOOGLE_ID = 'test-user-scrollbook-dev-001';

    let user = await User.findOne({ googleId: TEST_GOOGLE_ID });
    if (!user) {
      user = await User.create({
        googleId: TEST_GOOGLE_ID,
        email: 'testuser@scrollbook.dev',
        name: 'Test Traveler',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=scrollbook',
      });
      console.log('[test-auth] Created seeded test user:', user._id.toString());
    } else {
      console.log('[test-auth] Found existing test user:', user._id.toString());
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('[test-auth] Error:', error);
    res.status(500).json({ error: 'Failed to create test auth token' });
  }
});

// ── POST /api/test/cloudinary ─────────────────────────────────────────────────
// This route is DEPRECATED. Server-side Cloudinary uploads have been removed.
// Photos are now uploaded directly from the browser to the user's own Cloudinary account.
router.post('/cloudinary', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Deprecated. Photo uploads now go browser → Cloudinary directly. Use the upload preset flow.',
  });
});


export default router;

