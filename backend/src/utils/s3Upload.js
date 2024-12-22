import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3, { getS3BucketName } from '../config/s3.js';
import crypto from 'crypto';
import path from 'path';

class S3UploadService {
  constructor() {
    this.CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
  }

  /**
   * Generate a unique filename with the given extension
   * @param {string} originalName - Original filename
   * @param {string} variant - Variant identifier (e.g., 'small', 'medium')
   * @param {string} format - File format (e.g., 'webp', 'jpeg')
   * @returns {string} - Generated filename
   */
  generateFileName(originalName, variant, format) {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const cleanName = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, '');
    return `${cleanName}-${timestamp}-${hash}${variant ? `-${variant}` : ''}.${format}`;
  }

  /**
   * Upload a single image variant to S3
   * @param {Buffer} buffer - Image buffer
   * @param {string} key - S3 object key
   * @param {string} contentType - Content type of the image
   * @param {boolean} isOriginal - Whether this is the original image
   * @returns {Promise<string>} - CDN URL of the uploaded image
   */
  async uploadVariant(buffer, key, contentType, isOriginal = false) {
    const bucketName = getS3BucketName();
    
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: isOriginal ? 'private, no-cache' : 'public, max-age=31536000, immutable', // 1 year cache for processed images
        ...(isOriginal && { Metadata: { 'original': 'true' } })
      });

      await s3.send(command);
      
      // Use CloudFront URL if available, otherwise fallback to S3
      if (this.CLOUDFRONT_DOMAIN) {
        return `https://${this.CLOUDFRONT_DOMAIN}/${key}`;
      }
      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Upload original image to S3
   * @param {Buffer} buffer - Original image buffer
   * @param {string} originalName - Original filename
   * @param {string} contentType - Content type of the image
   * @returns {Promise<string>} - S3 key of the uploaded original
   */
  async uploadOriginal(buffer, originalName, contentType) {
    const key = `originals/${this.generateFileName(originalName, null, path.extname(originalName).slice(1))}`;
    await this.uploadVariant(buffer, key, contentType, true);
    return key;
  }

  /**
   * Upload all variants of an image to S3
   * @param {Object} processedImages - Object containing processed image variants
   * @param {string} originalName - Original filename
   * @param {Buffer} originalBuffer - Original image buffer
   * @param {string} contentType - Original content type
   * @returns {Promise<Object>} - Object containing URLs for all variants
   */
  async uploadAllVariants(processedImages, originalName, originalBuffer, contentType) {
    const uploads = {
      metadata: processedImages.metadata,
      original: await this.uploadOriginal(originalBuffer, originalName, contentType),
      variants: {}
    };

    for (const [size, data] of Object.entries(processedImages.processed)) {
      const variants = {
        webp: {
          buffer: data.webp,
          contentType: 'image/webp',
          key: this.generateFileName(originalName, size, 'webp')
        },
        jpeg: {
          buffer: data.jpeg,
          contentType: 'image/jpeg',
          key: this.generateFileName(originalName, size, 'jpg')
        }
      };

      uploads.variants[size] = {
        dimensions: data.dimensions,
        urls: {}
      };

      // Upload both WebP and JPEG variants
      for (const [format, variant] of Object.entries(variants)) {
        try {
          const url = await this.uploadVariant(
            variant.buffer,
            `processed/${size}/${variant.key}`,
            variant.contentType
          );
          uploads.variants[size].urls[format] = url;
        } catch (error) {
          console.error(`Failed to upload ${size} ${format}:`, error);
          // Continue with other uploads even if one fails
        }
      }
    }

    return uploads;
  }
}

export default new S3UploadService();
