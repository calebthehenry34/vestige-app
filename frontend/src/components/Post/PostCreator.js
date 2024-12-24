import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { API_URL } from '../../config';
import PostCreatorMenu from './PostCreatorMenu';
import PhotoPostCreator from './PhotoPostCreator';

const PostCreator = ({ isOpen, onClose, onPostCreated, user }) => {
  const [showMenu, setShowMenu] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState(null);

  const handlePhotoPost = async (photoData) => {
    try {
      setError(null);

      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add each processed image
      photoData.images.forEach((image, index) => {
        formData.append('images', image);
      });
      
      // Add other data
      formData.append('caption', photoData.caption);
      formData.append('location', photoData.location);
      formData.append('type', 'photo');

      const result = await axios.post(
        `${API_URL}/api/posts/multi`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );

      if (onPostCreated) {
        onPostCreated(result.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating photo post');
    }
  };

  const renderCreator = () => {
    switch (selectedOption) {
      case 'photo':
        return (
          <PhotoPostCreator
            user={user}
            onBack={() => setShowMenu(true)}
            onPublish={handlePhotoPost}
          />
        );
      case 'write':
        // TODO: Implement WritePostCreator
        return <div>Write Post Creator (Coming Soon)</div>;
      case 'moments':
        // TODO: Implement MomentsCreator
        return <div>Moments Creator (Coming Soon)</div>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg">
      {showMenu ? (
        <PostCreatorMenu
          isOpen={true}
          onClose={onClose}
          onOptionSelect={(option) => {
            setSelectedOption(option);
            setShowMenu(false);
          }}
        />
      ) : (
        renderCreator()
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

PostCreator.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPostCreated: PropTypes.func,
  user: PropTypes.object.isRequired
};

export default PostCreator;
