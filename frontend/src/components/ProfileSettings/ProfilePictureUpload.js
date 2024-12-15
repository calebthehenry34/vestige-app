// In components/ProfileSettings/ProfilePictureUpload.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const ProfilePictureUpload = () => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
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

      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(API_URL + '/api/users/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();
      updateUser({ ...user, profilePicture: data.profilePicture });

    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img
            src={previewUrl || user.profilePicture || '/api/placeholder/100/100'}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div>
          <label className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600">
            Change Photo
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;