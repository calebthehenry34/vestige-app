export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageVariant {
  dimensions: ImageDimensions;
  urls: {
    webp: string;
    jpeg: string;
  };
}

export interface ImageMetadata {
  originalWidth: number;
  originalHeight: number;
  format: string;
  size: number;
}

export interface OptimizedImageData {
  type: 'image';
  variants: {
    thumbnail?: ImageVariant;
    small?: ImageVariant;
    medium?: ImageVariant;
    large?: ImageVariant;
  };
  metadata: ImageMetadata;
  placeholder: string;
}

export interface LegacyImageData {
  type: 'image';
  legacy: {
    url: string;
    key: string;
  };
}

export type MediaData = OptimizedImageData | LegacyImageData;

export interface ProcessedImageResult {
  metadata: ImageMetadata;
  processed: {
    [size: string]: {
      dimensions: ImageDimensions;
      webp: Buffer;
      jpeg: Buffer;
    };
  };
}

export interface UploadedImageResult {
  metadata: ImageMetadata;
  variants: {
    [size: string]: {
      dimensions: ImageDimensions;
      urls: {
        webp: string;
        jpeg: string;
      };
    };
  };
}
