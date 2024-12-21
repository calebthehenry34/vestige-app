import imageCompression from 'browser-image-compression';
import localforage from 'localforage';

// Initialize localforage instance for image cache
const imageCache = localforage.createInstance({
  name: 'imageCache'
});

// Compression options for different sizes
const compressionOptions = {
  small: {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 400,
    useWebWorker: true
  },
  medium: {
    maxSizeMB: 0.7,
    maxWidthOrHeight: 800,
    useWebWorker: true
  },
  large: {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1200,
    useWebWorker: true
  },
  thumbnail: {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 100,
    useWebWorker: true
  }
};

// Generate a cache key for an image
const getCacheKey = (file, size) => {
  return `${file.name}-${size}-${file.lastModified}`;
};

// Compress image and cache the result
export const compressImage = async (file, size = 'medium') => {
  try {
    // Check cache first
    const cacheKey = getCacheKey(file, size);
    const cachedImage = await imageCache.getItem(cacheKey);
    
    if (cachedImage) {
      return new File([cachedImage], file.name, { type: 'image/jpeg' });
    }

    // Compress the image
    const options = compressionOptions[size] || compressionOptions.medium;
    const compressedFile = await imageCompression(file, options);
    
    // Cache the compressed image
    await imageCache.setItem(cacheKey, await compressedFile.arrayBuffer());
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

// Generate all required image sizes
export const generateImageSizes = async (file) => {
  try {
    const sizes = ['thumbnail', 'small', 'medium', 'large'];
    const compressedImages = await Promise.all(
      sizes.map(size => compressImage(file, size))
    );
    
    return {
      thumbnail: compressedImages[0],
      small: compressedImages[1],
      medium: compressedImages[2],
      large: compressedImages[3]
    };
  } catch (error) {
    console.error('Error generating image sizes:', error);
    throw error;
  }
};

// Clear old cached images (call this periodically)
export const clearOldCache = async () => {
  try {
    const keys = await imageCache.keys();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const key of keys) {
      const [, , timestamp] = key.split('-');
      if (Number(timestamp) < oneWeekAgo) {
        await imageCache.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Get profile image URL (existing function)
export const getProfileImageUrl = (profilePicture, username) => {
  if (!profilePicture) {
    return `https://ui-avatars.com/api/?name=${username}&background=random`;
  }
  return profilePicture;
};
