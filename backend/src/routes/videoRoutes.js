// routes/videoRoutes.js
import express from 'express';
import multer from 'multer';
import auth from '../middleware/authMiddleware.js';
import videoController from '../controllers/videoController.js';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
  }
});

const videoUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Not a video file'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Routes
router.get('/', auth, videoController.getVideoPosts);
router.post('/', auth, videoUpload.single('video'), videoController.createVideoPost);
router.delete('/:id', auth, videoController.deleteVideoPost);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Maximum size is 100MB' });
    }
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

export default router;