// frontend/src/utils/imageUtils.js
import { API_URL } from '../config';

export const getProfileImageUrl = (profilePicture, username) => {
  try {
    // If profile picture or username is null/undefined, return default avatar
    if (!profilePicture || !username) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }

    // Return the appropriate URL based on whether it's a full URL or a relative path
    return profilePicture.startsWith('http') 
      ? profilePicture 
      : `${API_URL}/uploads/${profilePicture}`;
      
  } catch (error) {
    // If anything fails, return default avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
  }
};
