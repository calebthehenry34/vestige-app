import imageCompression from 'browser-image-compression';
import localforage from 'localforage';

// Initialize localforage instance for image cache
const imageCache = localforage.createInstance({
  name: 'imageCache'
});

// Check WebP support
export const checkWebPSupport = async () => {
  if (typeof window === 'undefined') return false;
  
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

// Generate blur placeholder
export const generateBlurPlaceholder = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Tiny size for blur placeholder
        canvas.width = 20;
        canvas.height = (img.height * 20) / img.width;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 and resolve
        resolve(canvas.toDataURL('image/jpeg', 0.1));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

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

// Generate srcset string for responsive images
export const generateSrcSet = (imageUrls) => {
  return Object.entries(imageUrls)
    .map(([size, url]) => {
      const width = compressionOptions[size].maxWidthOrHeight;
      return `${url} ${width}w`;
    })
    .join(', ');
};

// Generate sizes attribute for responsive images
export const generateSizes = (defaultSize = 'medium') => {
  return '(max-width: 400px) 100vw, ' +
         '(max-width: 800px) 800px, ' +
         `${compressionOptions[defaultSize].maxWidthOrHeight}px`;
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
    
    // Generate blur placeholder
    const blurPlaceholder = await generateBlurPlaceholder(file);
    
    return {
      thumbnail: compressedImages[0],
      small: compressedImages[1],
      medium: compressedImages[2],
      large: compressedImages[3],
      blurPlaceholder
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

// Get media URL (for images and videos)
export const getMediaUrl = (media) => {
  if (!media) return '';

  // Handle new media structure with variants
  if (media.variants) {
    const variant = media.variants.large || media.variants.original;
    if (variant) {
      // Try CDN URL first
      if (variant.cdnUrl) return variant.cdnUrl;
      // Then try WebP or JPEG URL
      if (variant.urls) {
        const url = variant.urls.webp || variant.urls.jpeg;
        if (url) {
          if (url.startsWith('http')) return url;
          return `${process.env.REACT_APP_API_URL || ''}/uploads/${url}`;
        }
      }
      // Fallback to direct URL if available
      if (variant.url) {
        if (variant.url.startsWith('http')) return variant.url;
        return `${process.env.REACT_APP_API_URL || ''}/uploads/${variant.url}`;
      }
    }
  }

  // Handle legacy media structure
  if (media.legacy) {
    if (media.legacy.cdnUrl) return media.legacy.cdnUrl;
    if (media.legacy.url) {
      if (media.legacy.url.startsWith('http')) return media.legacy.url;
      return `${process.env.REACT_APP_API_URL || ''}/uploads/${media.legacy.url}`;
    }
  }

  // Handle direct URL string
  if (typeof media === 'string') {
    if (media.startsWith('http')) return media;
    return `${process.env.REACT_APP_API_URL || ''}/uploads/${media}`;
  }

  return '';
};

// Get profile image URL
export const getProfileImageUrl = (user) => {
  if (!user) return `https://ui-avatars.com/api/?name=user&background=random`;
  
  const profilePicture = user.profilePicture || user.avatar;
  if (!profilePicture) {
    return `https://ui-avatars.com/api/?name=${user.username || 'user'}&background=random`;
  }

  // Handle new media structure with variants
  if (profilePicture.variants) {
    const variant = profilePicture.variants.small || profilePicture.variants.original;
    if (variant) {
      // Try CDN URL first
      if (variant.cdnUrl) return variant.cdnUrl;
      // Then try WebP or JPEG URL
      if (variant.urls) {
        const url = variant.urls.webp || variant.urls.jpeg;
        if (url) {
          if (url.startsWith('http')) return url;
          return `${process.env.REACT_APP_API_URL || ''}/uploads/${url}`;
        }
      }
      // Fallback to direct URL if available
      if (variant.url) {
        if (variant.url.startsWith('http')) return variant.url;
        return `${process.env.REACT_APP_API_URL || ''}/uploads/${variant.url}`;
      }
    }
  }

  // Handle legacy media structure
  if (profilePicture.legacy) {
    if (profilePicture.legacy.cdnUrl) return profilePicture.legacy.cdnUrl;
    if (profilePicture.legacy.url) {
      if (profilePicture.legacy.url.startsWith('http')) return profilePicture.legacy.url;
      return `${process.env.REACT_APP_API_URL || ''}/uploads/${profilePicture.legacy.url}`;
    }
  }

  // Handle direct URL string
  if (typeof profilePicture === 'string') {
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${process.env.REACT_APP_API_URL || ''}/uploads/${profilePicture}`;
  }

  return `https://ui-avatars.com/api/?name=${user.username || 'user'}&background=random`;
};

// Aspect ratio constants
export const ASPECT_RATIOS = {
  LANDSCAPE: '16:9',
  PORTRAIT: '4:5',
  VERTICAL: '9:16'
};

// Calculate aspect ratio from dimensions
const calculateAspectRatio = (width, height) => {
  return width / height;
};

// Detect closest aspect ratio
export const detectAspectRatio = (width, height) => {
  const ratio = calculateAspectRatio(width, height);
  
  // Define target ratios
  const ratios = {
    [ASPECT_RATIOS.LANDSCAPE]: 16/9,  // 1.77778
    [ASPECT_RATIOS.PORTRAIT]: 4/5,    // 0.8
    [ASPECT_RATIOS.VERTICAL]: 9/16    // 0.5625
  };

  // Find the closest ratio
  let closestRatio = ASPECT_RATIOS.PORTRAIT; // default
  let minDiff = Math.abs(ratio - ratios[ASPECT_RATIOS.PORTRAIT]);

  Object.entries(ratios).forEach(([name, value]) => {
    const diff = Math.abs(ratio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = name;
    }
  });

  return closestRatio;
};

// Get dimensions from image file
export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: detectAspectRatio(img.width, img.height)
      });
    };
    img.src = URL.createObjectURL(file);
  });
};

// Get aspect ratio dimensions
export const getAspectRatioDimensions = (aspectRatio) => {
  switch (aspectRatio) {
    case ASPECT_RATIOS.LANDSCAPE:
      return { width: 16, height: 9 };
    case ASPECT_RATIOS.PORTRAIT:
      return { width: 4, height: 5 };
    case ASPECT_RATIOS.VERTICAL:
      return { width: 9, height: 16 };
    default:
      return { width: 4, height: 5 }; // default to 4:5
  }
};

// Create optimized image component props
export const createImageProps = (imageUrls, alt, defaultSize = 'medium') => {
  return {
    src: imageUrls[defaultSize],
    srcSet: generateSrcSet(imageUrls),
    sizes: generateSizes(defaultSize),
    loading: 'lazy',
    alt,
    style: { backgroundColor: '#f0f0f0' }, // Placeholder background
    onError: (e) => {
      e.target.style.backgroundColor = '#e0e0e0';
    }
  };
};
