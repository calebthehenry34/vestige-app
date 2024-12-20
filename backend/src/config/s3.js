import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
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

  // Debug: Log credential details safely
  console.log('S3 Configuration:', {
    accessKeyId: required.AWS_ACCESS_KEY_ID ? `${required.AWS_ACCESS_KEY_ID.slice(0, 4)}...${required.AWS_ACCESS_KEY_ID.slice(-4)}` : 'Missing',
    secretKeyPresent: !!required.AWS_SECRET_ACCESS_KEY,
    secretKeyLength: required.AWS_SECRET_ACCESS_KEY?.length,
    bucketName: required.AWS_BUCKET_NAME,
    region: required.AWS_REGION
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

const validateBucket = async (client, bucketName) => {
  try {
    console.log(`Validating bucket: ${bucketName}`);
    const command = new HeadBucketCommand({ Bucket: bucketName });
    await client.send(command);
    console.log('Bucket validation successful');
    return true;
  } catch (error) {
    console.error('Bucket validation error:', {
      message: error.message,
      code: error.code,
      bucketName
    });
    return false;
  }
};

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
      forcePathStyle: true,
      // Add configuration for handling larger files
      requestHandler: {
        abortSignal: {
          timeoutInMs: 900000 // 15 minutes timeout
        }
      }
    });

    console.log('S3 Client initialized with explicit credentials');

    // Validate bucket immediately
    validateBucket(s3, process.env.AWS_BUCKET_NAME)
      .then(isValid => {
        if (!isValid) {
          console.error('Bucket validation failed - S3 functionality may be impaired');
          // Don't set s3 to null here, as the bucket might exist but we don't have permission to HeadBucket
        }
      })
      .catch(error => {
        console.error('Error during bucket validation:', error);
      });

  } catch (error) {
    console.error("Error initializing S3 client:", {
      message: error.message,
      stack: error.stack,
      config: {
        region: process.env.AWS_REGION,
        bucketName: process.env.AWS_BUCKET_NAME
      }
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
