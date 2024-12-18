// In a new file like utils/imageUtils.js
export const getProfileImageUrl = (profilePicture, username) => {
    if (!profilePicture) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`;
    }
    return profilePicture.startsWith('http') 
      ? profilePicture 
      : `${API_URL}/uploads/${profilePicture}`;
  };