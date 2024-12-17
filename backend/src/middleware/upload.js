// src/middleware/upload.js
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { fileURLToPath } from 'url';
import s3, { isS3Available, getS3BucketName } from '../config/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let upload;

if (isS3Available()) {
  // S3 storage configuration
  const s3Storage = multerS3({
    s3: s3,
    bucket: getS3BucketName(),
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  upload = multer({ storage: s3Storage });
  console.log('Upload middleware configured for S3 storage');
} else {
  // Fallback to local disk storage
  console.log('Falling back to local disk storage');
  const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  upload = multer({ storage: diskStorage });
}

export default upload;
