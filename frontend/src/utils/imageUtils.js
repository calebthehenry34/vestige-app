// frontend/src/utils/imageUtils.js
import { API_URL } from '../config';

export const getProfileImageUrl = (profilePicture, username) => {
  try {
    // If no profile picture, return avatar
    if (!profilePicture) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }

    // Construct the profile picture URL
    const imageUrl = profilePicture.startsWith('http') 
      ? profilePicture 
      : `${API_URL}/uploads/${profilePicture}`;

    // Test if the image exists/is valid
    const img = new Image();
    img.src = imageUrl;
    img.onerror = () => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    };

    return imageUrl;
  } catch (error) {
    // If anything fails, return avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
  }
};