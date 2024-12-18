import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
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

  // Debug: Log the raw secret key length and first/last few characters
  if (required.AWS_SECRET_ACCESS_KEY) {
    console.log('Secret Key Debug:', {
      length: required.AWS_SECRET_ACCESS_KEY.length,
      firstChars: required.AWS_SECRET_ACCESS_KEY.substring(0, 4),
      lastChars: required.AWS_SECRET_ACCESS_KEY.substring(required.AWS_SECRET_ACCESS_KEY.length - 4),
      containsPlus: required.AWS_SECRET_ACCESS_KEY.includes('+'),
      containsSlash: required.AWS_SECRET_ACCESS_KEY.includes('/')
    });
  }

  // Log each credential status (without exposing sensitive data)
  Object.entries(required).forEach(([key, value]) => {
    if (key === 'AWS_SECRET_ACCESS_KEY' && value) {
      console.log(`${key}: Present (${value.length} characters)`);
    } else {
      console.log(`${key}: ${value ? 'Present' : 'Missing'}`);
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
    // Create explicit credentials object
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
    };

    // Log credentials state (safely)
    console.log('Creating S3 client with credentials:', {
      accessKeyIdPresent: !!credentials.accessKeyId,
      accessKeyIdLength: credentials.accessKeyId?.length,
      secretAccessKeyPresent: !!credentials.secretAccessKey,
      secretAccessKeyLength: credentials.secretAccessKey?.length,
      region: process.env.AWS_REGION
    });

    // Initialize the S3 client with explicit credentials
    s3 = new S3Client({
      region: process.env.AWS_REGION.trim(),
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      },
      maxAttempts: 3,
      // Force path style for troubleshooting
      forcePathStyle: true
    });

    console.log('S3 Client initialized with explicit credentials');

    // Test the credentials immediately
    const testCredentials = async () => {
      try {
        const creds = await s3.config.credentials();
        console.log('Credential test result:', {
          hasAccessKey: !!creds.accessKeyId,
          accessKeyLength: creds.accessKeyId?.length,
          hasSecretKey: !!creds.secretAccessKey,
          secretKeyLength: creds.secretAccessKey?.length,
          // Log the actual secret key length to verify it's not being truncated
          actualSecretKeyLength: process.env.AWS_SECRET_ACCESS_KEY.length
        });
        return true;
      } catch (error) {
        console.error('Credential test error:', {
          message: error.message,
          stack: error.stack
        });
        return false;
      }
    };

    // Run the test
    testCredentials();

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

// Export the credentials for direct access if needed
export const getCredentials = () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
});

export default s3;
