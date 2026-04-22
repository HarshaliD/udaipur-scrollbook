import { Response } from 'express';
import crypto from 'crypto';
import Trip from '../models/Trip';
import { AuthRequest } from '../middlewares/authMiddleware';

// ── POST /api/trips ───────────────────────────────────────────────────────────
// Create a new trip. Creator becomes admin and first member.
export const createTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, itinerary } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Trip name is required.' });
      return;
    }

    const userId = req.user!.id;

    // Generate a unique 6-char alphanumeric invite code
    let inviteCode = '';
    let unique = false;
    while (!unique) {
      inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
      const existing = await Trip.findOne({ inviteCode });
      if (!existing) unique = true;
    }

    const trip = await Trip.create({
      name: name.trim(),
      adminId: userId,
      members: [userId],
      inviteCode,
      itinerary: Array.isArray(itinerary) ? itinerary : [],
    });

    res.status(201).json(trip);
  } catch (err) {
    console.error('[createTrip]', err);
    res.status(500).json({ error: 'Failed to create trip.' });
  }
};


// ── POST /api/trips/join ──────────────────────────────────────────────────────
// Join a trip via invite code.
export const joinTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ error: 'inviteCode is required.' });
      return;
    }

    const userId = req.user!.id;
    const trip = await Trip.findOne({ inviteCode: inviteCode.toUpperCase() });

    if (!trip) {
      res.status(404).json({ error: 'No trip found with that invite code.' });
      return;
    }

    // Already a member — just return the trip (idempotent)
    const alreadyMember = trip.members.some((m) => m.toString() === userId);
    if (!alreadyMember) {
      trip.members.push(userId as unknown as typeof trip.members[0]);
      await trip.save();
    }

    res.status(200).json(trip);
  } catch (err) {
    console.error('[joinTrip]', err);
    res.status(500).json({ error: 'Failed to join trip.' });
  }
};

// ── GET /api/trips ────────────────────────────────────────────────────────────
// Returns all trips where the user is a member.
export const getMyTrips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const trips = await Trip.find({ members: userId }).sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (err) {
    console.error('[getMyTrips]', err);
    res.status(500).json({ error: 'Failed to fetch trips.' });
  }
};

// ── GET /api/trips/:id ────────────────────────────────────────────────────────
// Returns a single trip — only if requester is a member.
export const getTripById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const isMember = trip.members.some((m) => m.toString() === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.status(200).json(trip);
  } catch (err) {
    console.error('[getTripById]', err);
    res.status(500).json({ error: 'Failed to fetch trip.' });
  }
};

// ── PUT /api/trips/:id/itinerary ──────────────────────────────────────────────
// Replace the trip's itinerary. Any member can update it.
export const updateItinerary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const isMember = trip.members.some((m) => m.toString() === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const { itinerary } = req.body;
    if (!Array.isArray(itinerary)) {
      res.status(400).json({ error: 'itinerary must be an array.' });
      return;
    }

    trip.itinerary = itinerary;
    await trip.save();

    res.status(200).json(trip);
  } catch (err) {
    console.error('[updateItinerary]', err);
    res.status(500).json({ error: 'Failed to update itinerary.' });
  }
};
