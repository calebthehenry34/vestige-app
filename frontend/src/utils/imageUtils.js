// frontend/src/utils/imageUtils.js
import { API_URL } from '../config';

export const getProfileImageUrl = (profilePicture, username) => {
  try {
    // If profile picture or username is null/undefined, return default avatar
    if (!profilePicture || !username) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }

    // If it's already a full URL, return it as is
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }

    // Remove any leading slashes from the profile picture path
    const cleanPath = profilePicture.replace(/^\/+/, '');

    // If it starts with 'uploads/', remove it as the API endpoint already includes it
    const finalPath = cleanPath.startsWith('uploads/') 
      ? cleanPath.substring(8) 
      : cleanPath;

    // Construct the full URL
    return `${API_URL}/uploads/${finalPath}`;
      
  } catch (error) {
    console.error('Error constructing profile image URL:', error);
    // If anything fails, return default avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
  }
};
