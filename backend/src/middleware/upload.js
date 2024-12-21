import multer from 'multer';
import imageProcessingService from '../services/imageProcessingService.js';
import s3UploadService from '../utils/s3Upload.js';

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

/**
 * Process and upload an image, returning optimized variants
 * @param {Buffer} buffer - Original image buffer
 * @param {string} originalName - Original filename
 * @returns {Promise<Object>} - Processed and uploaded image data
 */
const processAndUploadImage = async (buffer, originalName) => {
  try {
    // Validate image
    const validation = await imageProcessingService.validateImage(buffer);
    if (!validation.isValid) {
      throw new Error(`Invalid image: ${validation.error}`);
    }

    // Process image into multiple sizes and formats
    const processed = await imageProcessingService.processImage(buffer);

    // Generate blur placeholder for progressive loading
    const placeholder = await imageProcessingService.generateBlurPlaceholder(buffer);

    // Upload all variants to S3
    const uploaded = await s3UploadService.uploadAllVariants(processed, originalName);

    return {
      ...uploaded,
      placeholder
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

// Create error handling wrapper
const handleUpload = (field) => {
  return async (req, res, next) => {
    console.log(`Starting file upload for field: ${field}`);
    
    upload.single(field)(req, res, async (err) => {
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
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? `${req.file.buffer.length} bytes` : 'Missing'
        });

        // Validate buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
          console.error('File buffer is empty or missing');
          return res.status(400).json({ error: 'Invalid file data' });
        }

        try {
          // Process and upload image
          const processedImage = await processAndUploadImage(
            req.file.buffer,
            req.file.originalname
          );

          // Add processed image data to request object
          req.processedImage = processedImage;

          // Log success
          console.log('Image processed successfully:', {
            originalName: req.file.originalname,
            variants: Object.keys(processedImage.variants),
            totalSizes: Object.keys(processedImage.variants).length
          });

          next();
        } catch (error) {
          console.error('Image processing failed:', error);
          return res.status(400).json({ 
            error: 'Failed to process image',
            details: error.message
          });
        }
      } else {
        console.log('No file received');
        next();
      }
    });
  };
};

export default {
  handleUpload
};
