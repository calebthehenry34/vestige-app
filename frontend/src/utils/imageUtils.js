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

    // If it's already a full URL (including pre-signed S3 URLs), return it as is
    if (profilePicture.startsWith('http') || profilePicture.startsWith('https')) {
      console.log('Using full URL:', profilePicture);
      return profilePicture;
    }

    // If it's an S3 key (starts with profile-pictures/), it should have come with a pre-signed URL
    // If we get here, something went wrong with the pre-signed URL generation
    if (profilePicture.startsWith('profile-pictures/')) {
      console.warn('Received S3 key without pre-signed URL:', profilePicture);
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`;
    }

    // For legacy uploads in the uploads directory
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
