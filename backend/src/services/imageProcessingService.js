import sharp from 'sharp';

// Image size presets
const IMAGE_SIZES = {
  thumbnail: 150,
  small: 300,
  medium: 600,
  large: 1200
};

// Quality settings for different formats
const QUALITY_SETTINGS = {
  jpeg: 80,
  webp: 75
};

class ImageProcessingService {
  /**
   * Process an image buffer into multiple sizes and formats
   * @param {Buffer} buffer - Original image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Object containing processed images
   */
  async processImage(buffer, options = {}) {
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Initialize results object
      const results = {
        metadata: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          format: metadata.format,
          size: buffer.length
        },
        processed: {}
      };

      // Process each size
      for (const [sizeName, maxWidth] of Object.entries(IMAGE_SIZES)) {
        // Skip sizes larger than original
        if (maxWidth > metadata.width) continue;

        // Calculate height maintaining aspect ratio
        const height = Math.round((maxWidth / metadata.width) * metadata.height);

        // Create resized base image
        const resized = sharp(buffer)
          .resize(maxWidth, height, {
            fit: 'contain',
            withoutEnlargement: true
          })
          .rotate() // Auto-rotate based on EXIF
          .withMetadata({ orientation: undefined }) // Strip EXIF but maintain orientation
          .toBuffer();

        // Process WebP version
        const webp = sharp(await resized)
          .webp({ quality: QUALITY_SETTINGS.webp })
          .toBuffer();

        // Process JPEG version
        const jpeg = sharp(await resized)
          .jpeg({ quality: QUALITY_SETTINGS.jpeg, mozjpeg: true })
          .toBuffer();

        // Store results
        results.processed[sizeName] = {
          dimensions: { width: maxWidth, height },
          webp: await webp,
          jpeg: await jpeg
        };
      }

      return results;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Generate a blur placeholder for progressive loading
   * @param {Buffer} buffer - Original image buffer
   * @returns {Promise<string>} - Base64 encoded blur placeholder
   */
  async generateBlurPlaceholder(buffer) {
    try {
      const placeholder = await sharp(buffer)
        .resize(20, 20, { fit: 'inside' })
        .blur(10)
        .toBuffer();
      
      return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
    } catch (error) {
      console.error('Blur placeholder generation error:', error);
      return null;
    }
  }

  /**
   * Validate image dimensions and format
   * @param {Buffer} buffer - Image buffer to validate
   * @returns {Promise<Object>} - Validation results
   */
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        isValid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Get optimal dimensions maintaining aspect ratio
   * @param {number} originalWidth - Original image width
   * @param {number} originalHeight - Original image height
   * @param {number} maxWidth - Maximum target width
   * @returns {Object} - Calculated dimensions
   */
  calculateDimensions(originalWidth, originalHeight, maxWidth) {
    const aspectRatio = originalWidth / originalHeight;
    const width = Math.min(maxWidth, originalWidth);
    const height = Math.round(width / aspectRatio);
    
    return { width, height };
  }
}

export default new ImageProcessingService();
