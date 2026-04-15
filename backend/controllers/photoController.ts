import { Request, Response } from 'express';
import Photo from '../models/Photo';
import User from '../models/User';
import { uploadImage } from '../services/cloudinaryService';
import { backupToDriveInBackground } from '../services/driveService';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getPhotosByPlace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { placeSlug } = req.query;
    if (!placeSlug) {
      res.status(400).json({ error: 'placeSlug query parameter is required' });
      return;
    }

    const photos = await Photo.find({ placeSlug: placeSlug as string }).sort({ uploadedAt: -1 });
    res.status(200).json(photos);
  } catch (error) {
    console.error('Get Photos Error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
};

export const getAllPhotosGrouped = async (req: Request, res: Response): Promise<void> => {
  try {
    // Return a map of placeSlug -> cloudinaryUrl[] so the frontend can
    // directly hydrate photos state without extra round-trips.
    const photos = await Photo.find({}, 'placeSlug cloudinaryUrl uploadedAt').sort({ uploadedAt: -1 });

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

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const { placeSlug, placeName } = req.body;
    if (!placeSlug || !placeName) {
      res.status(400).json({ error: 'placeSlug and placeName are required' });
      return;
    }

    const uploaderId = req.user?.id;
    if (!uploaderId) {
      res.status(401).json({ error: 'User context is missing' });
      return;
    }

    const user = await User.findById(uploaderId);
    if (!user) {
      res.status(404).json({ error: 'Uploader user not found' });
      return;
    }

    // 1. Upload to Cloudinary (blocks)
    const cloudinaryUrl = await uploadImage(req.file.buffer, placeSlug);

    // 2. Save to Mongo (blocks)
    const photo = await Photo.create({
      cloudinaryUrl,
      placeSlug,
      placeName,
      uploaderName: user.name,
      uploaderAvatar: user.avatar,
      uploaderId: user._id,
    });

    // 3. Complete Request immediately
    res.status(201).json(photo);

    // 4. FIRE AND FORGET - Background Job (Phase 2 stub)
    backupToDriveInBackground(photo._id.toString(), req.file.buffer, placeSlug);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};
