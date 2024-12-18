// In components/ProfileSettings/ProfilePictureUpload.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const ProfilePictureUpload = () => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user, updateUser } = useAuth();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload image
      handleUpload(file);
    }
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(API_URL + '/api/users/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload profile picture');
      }

      const data = await response.json();
      updateUser({ ...user, profilePicture: data.profilePicture });
      
      // Update preview URL to show the new image
      setPreviewUrl(API_URL + '/uploads/' + data.profilePicture);

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const currentProfilePicture = user?.profilePicture 
    ? API_URL + '/uploads/' + user.profilePicture
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img
            src={previewUrl || currentProfilePicture}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
            }}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <label className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 text-center">
            Change Photo
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
            />
          </label>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
