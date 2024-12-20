import { S3Client, PutBucketCorsCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const createS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION.trim(),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
    }
  });
};

const setupBucket = async () => {
  const s3 = createS3Client();
  const bucketName = process.env.AWS_BUCKET_NAME;

  try {
    // Set CORS configuration
    console.log('Setting CORS configuration...');
    await s3.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: [
              'http://localhost:3000',
              'https://gleeful-starburst-18884e.netlify.app'
            ],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600
          }
        ]
      }
    }));
    console.log('CORS configuration set successfully');

    // Set bucket policy for public read access
    console.log('Setting bucket policy...');
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
      ]
    };

    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    }));
    console.log('Bucket policy set successfully');

    console.log('S3 bucket setup completed successfully');
  } catch (error) {
    console.error('Error setting up S3 bucket:', error);
    throw error;
  }
};

// Run the setup
setupBucket()
  .then(() => {
    console.log('Setup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
