import { CloudFrontClient, CreateDistributionCommand, CreateInvalidationCommand, GetDistributionCommand } from '@aws-sdk/client-cloudfront';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

let cloudfront = null;

const initializeCloudFront = async () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('AWS credentials not found, skipping CloudFront initialization');
    return null;
  }

  try {
    cloudfront = new CloudFrontClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
      }
    });

    // If distribution ID exists, verify it
    if (process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      try {
        const command = new GetDistributionCommand({
          Id: process.env.CLOUDFRONT_DISTRIBUTION_ID
        });
        await cloudfront.send(command);
        console.log('Existing CloudFront distribution verified');
        return cloudfront;
      } catch (error) {
        console.warn('Could not verify existing distribution:', error.message);
      }
    }

    // Create new distribution if needed
    if (process.env.IS_PRODUCTION) {
      await createDistribution();
    }

    return cloudfront;
  } catch (error) {
    console.error('Error initializing CloudFront:', error);
    return null;
  }
};

const createDistribution = async () => {
  if (!cloudfront || !process.env.AWS_BUCKET_NAME) return null;

  const bucketDomain = `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
  
  const distributionConfig = {
    CallerReference: Date.now().toString(),
    Comment: 'Image CDN for Vestige',
    Enabled: true,
    DefaultCacheBehavior: {
      TargetOriginId: 'S3Origin',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'],
        CachedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD']
        }
      },
      CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // Managed-CachingOptimized
      OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf', // Managed-CORS-S3Origin
      ResponseHeadersPolicyId: '67f7725c-6f97-4210-82d7-5512b31e9d03', // Managed-SecurityHeadersPolicy
      Compress: true,
      SmoothStreaming: false
    },
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: 'S3Origin',
          DomainName: bucketDomain,
          S3OriginConfig: {
            OriginAccessIdentity: ''
          },
          OriginPath: '',
          CustomHeaders: {
            Quantity: 0,
            Items: []
          },
          ConnectionAttempts: 3,
          ConnectionTimeout: 10
        }
      ]
    },
    CustomErrorResponses: {
      Quantity: 1,
      Items: [
        {
          ErrorCode: 403,
          ResponsePagePath: '',
          ResponseCode: '404',
          ErrorCachingMinTTL: 300
        }
      ]
    },
    PriceClass: 'PriceClass_All',
    WebACLId: '',
    HttpVersion: 'http2',
    IsIPV6Enabled: true
  };

  try {
    const command = new CreateDistributionCommand({
      DistributionConfig: distributionConfig
    });

    const response = await cloudfront.send(command);
    const distribution = response.Distribution;

    // Log the distribution details for Render logs
    console.log('CloudFront Distribution Created:', {
      Id: distribution.Id,
      DomainName: distribution.DomainName,
      Status: distribution.Status
    });

    // Store distribution details in environment
    process.env.CLOUDFRONT_DISTRIBUTION_ID = distribution.Id;
    process.env.CLOUDFRONT_DOMAIN = distribution.DomainName;

    return distribution;
  } catch (error) {
    console.error('Error creating CloudFront distribution:', error);
    return null;
  }
};

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

// Initialize CloudFront when this module is imported
initializeCloudFront().catch(console.error);

export default cloudfront;
