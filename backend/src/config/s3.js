import { S3Client } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
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
    // Create credentials provider with explicit refresh
    const credentialsProvider = fromEnv();

    // Debug: Test credential loading
    const testCredentials = async () => {
      try {
        const credentials = await credentialsProvider();
        console.log('Credentials loaded successfully:', {
          hasAccessKey: !!credentials.accessKeyId,
          accessKeyLength: credentials.accessKeyId?.length,
          hasSecretKey: !!credentials.secretAccessKey,
          secretKeyLength: credentials.secretAccessKey?.length,
          expiresAt: credentials.expiration
        });
        return true;
      } catch (error) {
        console.error('Error loading credentials:', {
          message: error.message,
          stack: error.stack
        });
        return false;
      }
    };

    // Test credentials before creating client
    if (await testCredentials()) {
      // Initialize the S3 client with v3 SDK
      s3 = new S3Client({
        region: process.env.AWS_REGION.trim(),
        credentials: credentialsProvider,
        maxAttempts: 3
      });

      console.log('S3 Client initialized with credential provider');
    } else {
      console.error('Failed to load credentials, S3 client not initialized');
      s3 = null;
    }
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

// Export the credentials provider for direct access if needed
export const getCredentialsProvider = () => fromEnv();

export default s3;
