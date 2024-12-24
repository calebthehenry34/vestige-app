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
  jpeg: 90,
  webp: 85
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
      // Validate buffer
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Invalid input: buffer expected');
      }

      // Set resource limits for large images
      sharp.cache(false); // Disable caching for memory optimization
      sharp.concurrency(1); // Process one image at a time

      // Get image metadata with error handling
      const image = sharp(buffer);
      const metadata = await image.metadata().catch(err => {
        console.error('Metadata extraction error:', err);
        throw new Error('Failed to extract image metadata');
      });

      // Validate format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!supportedFormats.includes(metadata.format?.toLowerCase())) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      // Log processing start
      console.log('Processing image:', {
        originalFormat: metadata.format,
        dimensions: `${metadata.width}x${metadata.height}`,
        size: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`
      });
      
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

      // Process each size with progress tracking
      for (const [sizeName, maxWidth] of Object.entries(IMAGE_SIZES)) {
        // Skip sizes larger than original
        if (maxWidth > metadata.width) {
          console.log(`Skipping ${sizeName} size - larger than original`);
          continue;
        }

        // Calculate height maintaining aspect ratio
        const height = Math.round((maxWidth / metadata.width) * metadata.height);

        console.log(`Processing ${sizeName} size...`);
        
        // Create resized base image with optimizations
        const resized = sharp(buffer, { failOnError: true })
          .resize(maxWidth, height, {
            fit: 'contain',
            withoutEnlargement: true,
            kernel: 'lanczos3' // High-quality resampling
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
      // Detailed error logging
      console.error('Image processing error:', {
        error: error.message,
        stack: error.stack,
        inputSize: buffer?.length ? `${(buffer.length / 1024 / 1024).toFixed(2)}MB` : 'unknown',
        timestamp: new Date().toISOString()
      });
      
      // Clean up resources
      sharp.cache(false);
      
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
      if (!Buffer.isBuffer(buffer)) {
        return {
          isValid: false,
          error: 'Invalid input: buffer expected'
        };
      }

      // Check file size (max 15MB)
      const maxSize = 15 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return {
          isValid: false,
          error: 'Image too large (max 15MB)'
        };
      }

      const metadata = await sharp(buffer, { failOnError: true }).metadata();
      
      // Validate dimensions
      const maxDimension = 5000; // Max 5000px in either dimension
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        return {
          isValid: false,
          error: `Image dimensions too large (max ${maxDimension}px)`
        };
      }

      // Validate format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!supportedFormats.includes(metadata.format?.toLowerCase())) {
        return {
          isValid: false,
          error: `Unsupported format: ${metadata.format}`
        };
      }

      return {
        isValid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length,
          aspectRatio: (metadata.width / metadata.height).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Image validation error:', {
        error: error.message,
        stack: error.stack,
        inputSize: buffer?.length ? `${(buffer.length / 1024 / 1024).toFixed(2)}MB` : 'unknown'
      });
      
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
