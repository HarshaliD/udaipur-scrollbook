import { Response } from 'express';
import Photo from '../models/Photo';
import Trip from '../models/Trip';
import User from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

// ── Helper: verify tripId exists and requester is a member ────────────────────
async function resolveTripMember(
  tripId: string,
  userId: string,
  res: Response
): Promise<InstanceType<typeof Trip> | null> {
  if (!tripId) {
    res.status(400).json({ error: 'tripId is required.' });
    return null;
  }
  const trip = await Trip.findById(tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found.' });
    return null;
  }
  const isMember = trip.members.some((m) => m.toString() === userId);
  if (!isMember) {
    res.status(403).json({ error: 'Access denied. You are not a member of this trip.' });
    return null;
  }
  return trip;
}

// ── GET /api/photos?tripId=&placeSlug= ───────────────────────────────────────
export const getPhotosByPlace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tripId, placeSlug } = req.query as { tripId?: string; placeSlug?: string };
    const userId = req.user!.id;

    if (!tripId || !placeSlug) {
      res.status(400).json({ error: 'tripId and placeSlug are required.' });
      return;
    }

    const trip = await resolveTripMember(tripId, userId, res);
    if (!trip) return;

    const photos = await Photo.find({ tripId, placeSlug }).sort({ uploadedAt: -1 });
    res.status(200).json(photos);
  } catch (error) {
    console.error('Get Photos Error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
};

// ── GET /api/photos/all?tripId= ───────────────────────────────────────────────
export const getAllPhotosGrouped = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.query as { tripId?: string };
    const userId = req.user!.id;

    if (!tripId) {
      res.status(400).json({ error: 'tripId is required.' });
      return;
    }

    const trip = await resolveTripMember(tripId, userId, res);
    if (!trip) return;

    const photos = await Photo.find({ tripId }, 'placeSlug cloudinaryUrl uploadedAt').sort({ uploadedAt: -1 });

    const grouped: Record<string, string[]> = {};
    for (const p of photos) {
      if (!grouped[p.placeSlug]) grouped[p.placeSlug] = [];
      grouped[p.placeSlug].push(p.cloudinaryUrl);
    }

    res.status(200).json(grouped);
  } catch (error) {
    console.error('Get All Grouped Photos Error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
};

// ── POST /api/photos ──────────────────────────────────────────────────────────
// The frontend uploads directly to Cloudinary and sends us only the resulting URL.
// We never touch the image file — no Multer, no binary handling.
export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cloudinaryUrl, placeSlug, placeName, tripId } = req.body;

    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
      res.status(400).json({ error: 'cloudinaryUrl is required.' });
      return;
    }
    if (!placeSlug || !placeName || !tripId) {
      res.status(400).json({ error: 'placeSlug, placeName, and tripId are required.' });
      return;
    }

    const uploaderId = req.user?.id;
    if (!uploaderId) {
      res.status(401).json({ error: 'User context is missing' });
      return;
    }

    // Verify membership before saving anything
    const trip = await resolveTripMember(tripId, uploaderId, res);
    if (!trip) return;

    const user = await User.findById(uploaderId);
    if (!user) {
      res.status(404).json({ error: 'Uploader user not found' });
      return;
    }

    // Save photo record — URL comes from the user's own Cloudinary account
    const photo = await Photo.create({
      tripId,
      cloudinaryUrl,
      placeSlug,
      placeName,
      uploaderName: user.name,
      uploaderAvatar: user.avatar,
      uploaderId: user._id,
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to save photo' });
  }
};
