import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
  secretAccessKey: process.env.AWS_SECRET_KEY?.trim(),
  region: process.env.AWS_REGION?.trim(),
});

// Verify if environment variables are loaded properly
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_KEY || !process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
  throw new Error("One or more required environment variables are not defined");
}

// Debugging logs to ensure correct environment variable values
console.log("AWS Access Key ID:", process.env.AWS_ACCESS_KEY_ID);
console.log("AWS Secret Access Key:", process.env.AWS_SECRET_KEY);
console.log("AWS Region:", process.env.AWS_REGION);
console.log("Loaded Bucket Name:", process.env.AWS_BUCKET_NAME);

// Initialize the S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(), // Using optional chaining to avoid undefined errors
  secretAccessKey: process.env.AWS_SECRET_KEY?.trim(),
  region: 'us-east-2', // Replace with your actual region value
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

// Example function to upload a file to S3
const uploadFile = (fileContent, key) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME.trim(),
    Key: key,
    Body: fileContent,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error("File upload error:", err);
    } else {
      console.log(`File uploaded successfully at ${data.Location}`);
    }
  });
};


export default s3;
