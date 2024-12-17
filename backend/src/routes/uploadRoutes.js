import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import { createPost, deletePost } from '../controllers/postController.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|heic|heif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Route for creating a post with image
router.post(
  '/post',
  auth,
  upload.single('image'),
  handleMulterError,
  createPost
);

// Route for deleting a post and its associated media
router.delete('/post/:id', auth, deletePost);

export default router;
