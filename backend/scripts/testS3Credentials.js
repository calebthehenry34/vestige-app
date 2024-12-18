import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Environment variables:', {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'present' : 'missing',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'present' : 'missing',
  region: process.env.AWS_REGION || 'missing'
});

