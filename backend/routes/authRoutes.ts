import { Router } from 'express';
import { googleAuth, getMe, updateMe } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

export default router;
