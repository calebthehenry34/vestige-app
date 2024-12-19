// frontend/src/utils/imageUtils.js
import { API_URL } from '../config';

export const getProfileImageUrl = (profilePicture, username) => {
  try {
    // If profile picture or username is null/undefined, return default avatar
    if (!profilePicture || !username) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }

    // If it's an S3 URL or any full URL, return it as is
    if (profilePicture.startsWith('http') || profilePicture.startsWith('https')) {
      return profilePicture;
    }

    // For local development or if it's a local path
    // Check if the path includes 'uploads' and handle accordingly
    if (profilePicture.includes('uploads/')) {
      // Remove any leading slashes and duplicate 'uploads'
      const cleanPath = profilePicture.replace(/^\/+/, '').replace(/^uploads\//, '');
      return `${API_URL}/uploads/${cleanPath}`;
    }

    // For any other case, assume it's a direct path and append to API_URL/uploads
    return `${API_URL}/uploads/${profilePicture}`;
      
  } catch (error) {
    console.error('Error constructing profile image URL:', error);
    // If anything fails, return default avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
  }
};
