import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  region: process.env.AWS_REGION?.trim(),
});

// Verify if environment variables are loaded properly
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
  throw new Error("One or more required environment variables are not defined");
}

// Initialize the S3 client
const s3 = new AWS.S3({
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
    console.log("Credentials loaded successfully");
  }
});

export default s3;
