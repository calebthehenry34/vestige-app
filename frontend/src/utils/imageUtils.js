// frontend/src/utils/imageUtils.js
import { API_URL } from '../config';

export const getProfileImageUrl = (profilePicture, username) => {
  try {
    console.log('Input values:', { profilePicture, username });

    // If profile picture or username is null/undefined, return default avatar
    if (!profilePicture || !username) {
      console.log('Using default avatar due to missing profilePicture or username');
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }

    // If it's an S3 URL or any full URL, return it as is
    if (profilePicture.startsWith('http') || profilePicture.startsWith('https')) {
      console.log('Using full URL:', profilePicture);
      return profilePicture;
    }

    // For any other case, assume it's a path relative to the API URL
    const fullUrl = `${API_URL}/uploads/${profilePicture}`;
    console.log('Constructed URL:', fullUrl);
    return fullUrl;

  } catch (error) {
    console.error('Error constructing profile image URL:', {
      error,
      profilePicture,
      username,
      API_URL
    });
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
  }
};
