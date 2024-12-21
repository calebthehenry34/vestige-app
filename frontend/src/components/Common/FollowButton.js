// components/Common/FollowButton.js
import React, { useState } from 'react';
import { HandshakeFilled, PersonAddRegular } from '@fluentui/react-icons';
import { API_URL } from '../../config';

const FollowButton = ({ userId, initialIsFollowing, onFollowChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollowToggle = async () => {
    try {
      setLoading(true);
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`${API_URL}/api/users/follow/${userId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }

      setIsFollowing(!isFollowing);
      if (onFollowChange) {
        onFollowChange(!isFollowing);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`px-3 py-1 text-sm rounded-lg flex items-center transition-all ${
        isFollowing 
          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {isFollowing ? (
        <>
          <HandshakeFilled className="w-4 h-4 mr-1" />
          Following
        </>
      ) : (
        <>
          <PersonAddRegular className="w-4 h-4 mr-1" />
          Follow
        </>
      )}
    </button>
  );
};

export default FollowButton;
