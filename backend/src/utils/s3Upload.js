import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3, { getS3BucketName } from '../config/s3.js';
import crypto from 'crypto';
import path from 'path';

class S3UploadService {
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
    return `${cleanName}-${timestamp}-${hash}-${variant}.${format}`;
  }

  /**
   * Upload a single image variant to S3
   * @param {Buffer} buffer - Image buffer
   * @param {string} key - S3 object key
   * @param {string} contentType - Content type of the image
   * @returns {Promise<string>} - S3 URL of the uploaded image
   */
  async uploadVariant(buffer, key, contentType) {
    const bucketName = getS3BucketName();
    
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      });

      await s3.send(command);
      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Upload all variants of an image to S3
   * @param {Object} processedImages - Object containing processed image variants
   * @param {string} originalName - Original filename
   * @returns {Promise<Object>} - Object containing URLs for all variants
   */
  async uploadAllVariants(processedImages, originalName) {
    const uploads = {
      metadata: processedImages.metadata,
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
            `images/${size}/${variant.key}`,
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
