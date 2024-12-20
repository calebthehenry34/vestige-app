// src/middleware/upload.js
import multer from 'multer';

// Configure multer with basic settings
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  // Accept the file
  cb(null, true);
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Create error handling wrapper
const handleUpload = (field) => {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size cannot exceed 50MB' });
          }
          return res.status(400).json({ error: err.message });
        }
        
        return res.status(400).json({ error: 'Error uploading file' });
      }

      // Log file details if present
      if (req.file) {
        console.log('File received:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? 'Present' : 'Missing'
        });
      } else {
        console.log('No file received');
      }

      next();
    });
  };
};

export default {
  handleUpload
};
