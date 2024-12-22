import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

let cloudfront = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.CLOUDFRONT_DISTRIBUTION_ID) {
  try {
    cloudfront = new CloudFrontClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
      }
    });
    
    console.log('CloudFront client initialized successfully');
  } catch (error) {
    console.error('Error initializing CloudFront client:', error);
    cloudfront = null;
  }
}

/**
 * Create a CloudFront invalidation for specific paths
 * @param {string[]} paths - Array of paths to invalidate
 * @returns {Promise<string>} - Invalidation ID
 */
export const createInvalidation = async (paths) => {
  if (!cloudfront || !process.env.CLOUDFRONT_DISTRIBUTION_ID) {
    console.warn('CloudFront not configured, skipping invalidation');
    return null;
  }

  try {
    const command = new CreateInvalidationCommand({
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths.map(p => p.startsWith('/') ? p : `/${p}`)
        }
      }
    });

    const response = await cloudfront.send(command);
    console.log('Created CloudFront invalidation:', response.Invalidation.Id);
    return response.Invalidation.Id;
  } catch (error) {
    console.error('Error creating CloudFront invalidation:', error);
    return null;
  }
};

/**
 * Check if CloudFront is properly configured
 * @returns {boolean}
 */
export const isCloudFrontConfigured = () => {
  return Boolean(
    cloudfront && 
    process.env.CLOUDFRONT_DISTRIBUTION_ID &&
    process.env.CLOUDFRONT_DOMAIN
  );
};

/**
 * Get CloudFront domain
 * @returns {string|null}
 */
export const getCloudFrontDomain = () => process.env.CLOUDFRONT_DOMAIN || null;

export default cloudfront;
