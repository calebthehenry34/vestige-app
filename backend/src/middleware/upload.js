// src/middleware/upload.js
import multer from 'multer';

// Configure multer with memory storage for S3 uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log('Processing file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    console.error('File type rejected:', file.mimetype);
    return cb(new Error('Only image files are allowed'));
  }

  // Accept the file
  console.log('File accepted');
  cb(null, true);
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow 1 file per request
  },
  fileFilter: fileFilter
});

// Create error handling wrapper
const handleUpload = (field) => {
  return (req, res, next) => {
    console.log(`Starting file upload for field: ${field}`);
    
    upload.single(field)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', {
          message: err.message,
          code: err.code,
          field: field,
          stack: err.stack
        });
        
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
          originalname: req.file.fieldname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? `${req.file.buffer.length} bytes` : 'Missing'
        });

        // Validate buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
          console.error('File buffer is empty or missing');
          return res.status(400).json({ error: 'Invalid file data' });
        }
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
