import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middlewares/authMiddleware';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── POST /api/auth/google ────────────────────────────────────────────────────
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'No Google token provided' });
      return;
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Invalid Google Identity token' });
      return;
    }

    const { sub: googleId, email, name, picture: avatar } = payload;

    // Find returning users or register new ones
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.create({
        googleId,
        email: email || '',
        name: name || 'Traveler',
        avatar: avatar || '',
      });
    }

    const jwtToken = generateToken(user._id);

    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        cloudinaryName: user.cloudinaryName ?? '',
        cloudinaryPreset: user.cloudinaryPreset ?? '',
      },
    });
  } catch (error) {
    console.error('Auth Error: ', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      cloudinaryName: user.cloudinaryName ?? '',
      cloudinaryPreset: user.cloudinaryPreset ?? '',
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
// Saves the user's own Cloudinary credentials. Protected by JWT middleware.
// Only updates the authenticated user — the userId comes from the verified token,
// not from the request body, so it's impossible to overwrite someone else.
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cloudinaryName, cloudinaryPreset } = req.body;

    if (typeof cloudinaryName !== 'string' || typeof cloudinaryPreset !== 'string') {
      res.status(400).json({ error: 'cloudinaryName and cloudinaryPreset must be strings.' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      {
        cloudinaryName: cloudinaryName.trim(),
        cloudinaryPreset: cloudinaryPreset.trim(),
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      cloudinaryName: user.cloudinaryName ?? '',
      cloudinaryPreset: user.cloudinaryPreset ?? '',
    });
  } catch (error) {
    console.error('Update Me Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
