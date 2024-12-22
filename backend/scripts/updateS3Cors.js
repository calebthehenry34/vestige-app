#!/usr/bin/env node
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const required = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION,
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN
};

// Validate required environment variables
const missing = Object.entries(required)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
  }
});

const updateCorsConfiguration = async () => {
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedOrigins: [
          `https://${process.env.CLOUDFRONT_DOMAIN}`,
          'http://localhost:3000',
          'http://localhost:5000'
        ],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 86400
      }
    ]
  };

  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      CORSConfiguration: corsConfig
    });

    await s3.send(command);
    console.log('S3 bucket CORS configuration updated successfully!');
    console.log('Allowed origins:', corsConfig.CORSRules[0].AllowedOrigins);
    
    console.log('\nNext steps:');
    console.log('1. Ensure your CloudFront distribution is fully deployed');
    console.log('2. Test image delivery through the CloudFront domain');
    console.log('3. Update your application to use the CloudFront URLs for images');

  } catch (error) {
    console.error('Error updating S3 bucket CORS configuration:', error);
    process.exit(1);
  }
};

// Run the update
updateCorsConfiguration().catch(console.error);
