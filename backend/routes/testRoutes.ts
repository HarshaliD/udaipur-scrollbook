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
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import User from '../models/User';
import Photo from '../models/Photo';
import { generateToken } from '../utils/jwt';
import { uploadImage } from '../services/cloudinaryService';

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
// Accepts { imageUrl, placeSlug } in the JSON body.
// Fetches the image from imageUrl, uploads it to Cloudinary under the
// "scrollbook/test" folder, and saves a Photo document to MongoDB using a
// pre-seeded test user — no auth header required.
//
// Body: { imageUrl: string, placeSlug?: string, placeName?: string }
router.post('/cloudinary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageUrl, placeSlug = 'city-palace', placeName = 'City Palace' } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      res.status(400).json({ error: 'imageUrl (string) is required in the request body.' });
      return;
    }

    // -- Fetch image from URL --------------------------------------------------
    console.log('[test-cloudinary] Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      res.status(400).json({ error: `Could not fetch imageUrl. Status: ${imageResponse.status}` });
      return;
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[test-cloudinary] Image fetched, size:', buffer.byteLength, 'bytes');

    // -- Upload to Cloudinary --------------------------------------------------
    console.log('[test-cloudinary] Uploading to Cloudinary, folder: scrollbook/', placeSlug);
    const cloudinaryUrl = await uploadImage(buffer, placeSlug);
    console.log('[test-cloudinary] Cloudinary URL:', cloudinaryUrl);

    // -- Find or create the test user for DB record ----------------------------
    const TEST_GOOGLE_ID = 'test-user-scrollbook-dev-001';
    let user = await User.findOne({ googleId: TEST_GOOGLE_ID });
    if (!user) {
      user = await User.create({
        googleId: TEST_GOOGLE_ID,
        email: 'testuser@scrollbook.dev',
        name: 'Test Traveler',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=scrollbook',
      });
    }

    // -- Save Photo to MongoDB -------------------------------------------------
    const photo = await Photo.create({
      cloudinaryUrl,
      placeSlug,
      placeName,
      uploaderName: user.name,
      uploaderAvatar: user.avatar,
      uploaderId: user._id,
    });
    console.log('[test-cloudinary] Photo saved to DB, id:', photo._id.toString());

    res.status(201).json({
      success: true,
      cloudinaryUrl,
      photoId: photo._id,
      placeSlug,
    });
  } catch (error) {
    console.error('[test-cloudinary] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Cloudinary test upload failed' });
  }
});

export default router;
