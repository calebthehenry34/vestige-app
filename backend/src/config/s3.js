import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Only initialize S3 if all required variables are present
const hasS3Credentials = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_BUCKET_NAME && 
                        process.env.AWS_REGION;

let s3 = null;

if (hasS3Credentials) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
    region: process.env.AWS_REGION?.trim(),
  });

  // Initialize the S3 client
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
    region: process.env.AWS_REGION?.trim(),
    signatureVersion: 'v4',
  });

  // Verify if credentials are loaded properly
  s3.config.getCredentials((err) => {
    if (err) {
      console.error("Error loading credentials:", err);
    } else {
      console.log("S3 Credentials loaded successfully");
    }
  });
} else {
  console.log("S3 credentials not found - S3 functionality will be disabled");
}

export default s3;
