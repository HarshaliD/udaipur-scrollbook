import { Router } from 'express';
import { uploadPhoto, getPhotosByPlace, getAllPhotosGrouped } from '../controllers/photoController';
import { authenticate } from '../middlewares/authMiddleware';
import { uploadMiddleware, handleUploadError } from '../middlewares/uploadMiddleware';

const router = Router();

// Retrieve photo count group
router.get('/all', getAllPhotosGrouped);

// Retrieve photos for specific place
router.get('/', getPhotosByPlace);

// Upload a generic photo memory
// handleUploadError catches multer errors (size, type) before photoController runs
router.post('/', authenticate, uploadMiddleware.single('file'), handleUploadError, uploadPhoto);

export default router;
