import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  createTrip,
  joinTrip,
  getMyTrips,
  getTripById,
  updateItinerary,
} from '../controllers/tripController';

const router = Router();

// All trip routes require authentication
router.use(authenticate);

router.post('/', createTrip);              // Create new trip
router.post('/join', joinTrip);            // Join via invite code
router.get('/', getMyTrips);              // Get all my trips
router.get('/:id', getTripById);           // Get single trip (members only)
router.put('/:id/itinerary', updateItinerary); // Update itinerary (members only)

export default router;
