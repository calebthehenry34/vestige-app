#!/usr/bin/env node
import { CloudFrontClient, CreateDistributionCommand, GetDistributionConfigCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const required = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION
};

// Validate required environment variables
const missing = Object.entries(required)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const cloudfront = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
  }
});

const createDistribution = async () => {
  const bucketDomain = `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  
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

    // Save distribution details to .env
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add CloudFront variables
    const updates = {
      CLOUDFRONT_DISTRIBUTION_ID: distribution.Id,
      CLOUDFRONT_DOMAIN: distribution.DomainName
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(
          new RegExp(`${key}=.*`), 
          `${key}=${value}`
        );
      } else {
        envContent += `\n${key}=${value}`;
      }
    });

    fs.writeFileSync(envPath, envContent);

    console.log('CloudFront distribution created successfully!');
    console.log('Distribution ID:', distribution.Id);
    console.log('Domain Name:', distribution.DomainName);
    console.log('Status:', distribution.Status);
    console.log('Environment variables updated in .env file');

    console.log('\nNext steps:');
    console.log('1. Wait for the distribution to be deployed (this can take 10-15 minutes)');
    console.log('2. Update your S3 bucket CORS configuration to allow the CloudFront domain');
    console.log('3. Test the CDN by accessing an image through the CloudFront domain');

  } catch (error) {
    console.error('Error creating CloudFront distribution:', error);
    process.exit(1);
  }
};

// Run the setup
createDistribution().catch(console.error);
