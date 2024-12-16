import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if all required S3 variables are present
const hasS3Credentials = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_BUCKET_NAME && 
                        process.env.AWS_REGION;

let s3 = null;

if (hasS3Credentials) {
  try {
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
        console.error("Error loading S3 credentials:", err);
      } else {
        console.log("S3 Credentials loaded successfully");
      }
    });
  } catch (error) {
    console.error("Error initializing S3:", error);
  }
} else {
  console.log("S3 credentials not found - S3 functionality will be disabled");
}

// Export a function to check if S3 is available
export const isS3Available = () => Boolean(s3);

// Export the s3 instance
export default s3;
