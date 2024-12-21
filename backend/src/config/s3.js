import { S3Client, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
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
      secretKeyLength: credentials.secretAccessKey?.length,
      region: process.env.AWS_REGION
    });

    // Initialize the S3 client with explicit credentials
    s3 = new S3Client({
      region: process.env.AWS_REGION.trim(),
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      },
      endpoint: `https://s3.${process.env.AWS_REGION.trim()}.amazonaws.com`,
      forcePathStyle: false,
      maxAttempts: 3,
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
        bucketName: process.env.AWS_BUCKET_NAME,
        endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`
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

// Generate a pre-signed URL for an S3 object
export const generatePresignedUrl = async (key, expiresIn = 3600) => {
  if (!s3 || !key) return null;
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    });
    
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return null;
  }
};

// Delete an object from S3
export const deleteS3Object = async (key) => {
  if (!s3 || !key) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    });
    
    await s3.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting object from S3:', error);
    return false;
  }
};

export default s3;
