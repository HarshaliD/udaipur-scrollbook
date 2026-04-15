import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

// Process uploads holding them entirely in memory
const storage = multer.memoryStorage();

// Only accept image MIME types
const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, webp, gif, etc.)'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Multer-specific error handler — must be 4-arg so Express treats it as an error handler
export const handleUploadError = (err: Error, _req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large. Maximum allowed size is 5 MB.' });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  next();
};
