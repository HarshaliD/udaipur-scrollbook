import { Router } from 'express';
import { uploadPhoto, getPhotosByPlace, getAllPhotosGrouped } from '../controllers/photoController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All photo read routes require authentication
router.get('/all', authenticate, getAllPhotosGrouped);
router.get('/', authenticate, getPhotosByPlace);

// Upload — receives only the Cloudinary URL (no file, no multer)
router.post('/', authenticate, uploadPhoto);

export default router;
