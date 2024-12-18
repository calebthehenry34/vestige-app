import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/test', upload.handleUpload('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

export default router;
