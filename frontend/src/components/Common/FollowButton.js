// components/Common/FollowButton.js
import React, { useState } from 'react';
import { HandshakeFilled, PersonAddRegular } from '@fluentui/react-icons';
import { API_URL } from '../../config';

const FollowButton = ({ userId, initialIsFollowing, onFollowChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isHovered, setIsHovered] = useState(false);
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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      const newFollowState = !isFollowing;
      setIsFollowing(newFollowState);
      
      // Only call onFollowChange after the API call is successful
      if (onFollowChange) {
        await onFollowChange(newFollowState);
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={loading}
      className={`px-3 py-1 text-sm rounded-lg flex items-center transition-all ${
        isFollowing 
          ? isHovered
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
          : 'bg-blue-500 hover:bg-blue-600 text-white border border-transparent'
      }`}
    >
      {isFollowing ? (
        <>
          <HandshakeFilled className="w-4 h-4 mr-1" />
          {isHovered ? 'Unfollow' : 'Following'}
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
