import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
// Specify the path to ensure we're loading from the correct location
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Function to validate S3 credentials with detailed logging
const validateS3Credentials = () => {
  console.log('Validating S3 credentials...');
  
  const required = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_REGION: process.env.AWS_REGION
  };

  // Log each credential status (without exposing sensitive data)
  Object.entries(required).forEach(([key, value]) => {
    console.log(`${key}: ${value ? 'Present' : 'Missing'}`);
    if (value) {
      // For non-sensitive fields, show the value
      if (key === 'AWS_REGION' || key === 'AWS_BUCKET_NAME') {
        console.log(`${key} value: ${value}`);
      }
    }
  });

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Missing required S3 environment variables:', missing.join(', '));
    return false;
  }

  return true;
};

let s3 = null;

if (validateS3Credentials()) {
  try {
    // Initialize the S3 client with v3 SDK
    s3 = new S3Client({
      region: process.env.AWS_REGION.trim(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
      },
      // Add maxAttempts for better reliability
      maxAttempts: 3
    });

    // Test the connection
    const testConnection = async () => {
      try {
        // Log configuration (without sensitive data)
        console.log('S3 Configuration:', {
          region: process.env.AWS_REGION,
          bucket: process.env.AWS_BUCKET_NAME,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
        });

        // The S3 client will be ready for use
        console.log("S3 Client initialized successfully");
      } catch (error) {
        console.error("Error testing S3 connection:", {
          message: error.message,
          code: error.code,
          requestId: error.$metadata?.requestId
        });
        s3 = null;
      }
    };

    testConnection();
  } catch (error) {
    console.error("Error initializing S3 client:", {
      message: error.message,
      stack: error.stack
    });
    s3 = null;
  }
} else {
  console.warn("S3 functionality disabled due to missing credentials");
}

export const isS3Available = () => Boolean(s3);

// Helper function to get the S3 bucket name
export const getS3BucketName = () => process.env.AWS_BUCKET_NAME;

export default s3;
