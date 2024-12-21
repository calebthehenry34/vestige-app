import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import FollowButton from '../Common/FollowButton';
import { Link } from 'react-router-dom';
import { DismissRegular } from '@fluentui/react-icons';

const FollowersModal = ({ isOpen, onClose, userId, type, theme, onFollowChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/users/${userId}/${type}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
  
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
  
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, type, isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleFollowChangeLocal = async (newFollowState, userId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/users/${userId}/${type}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      
      // Propagate the change to parent component
      if (onFollowChange) {
        onFollowChange(newFollowState);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div 
        className={`${
          theme === 'dark-theme' 
            ? 'bg-black border-zinc-800 text-white' 
            : 'bg-white border-gray-200 text-black'
        } w-[95vw] max-w-md rounded-2xl transform transition-all duration-300 ease-out shadow-xl relative ${
          isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark-theme' ? 'border-zinc-800' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-headlines">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors duration-200 ${
              theme === 'dark-theme' 
                ? 'hover:bg-zinc-900 text-gray-400 hover:text-gray-200' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <DismissRegular className="w-6 h-6" />
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-6">
              <div className={`animate-spin rounded-full h-8 w-8 ${
                theme === 'dark-theme' ? 'border-blue-400' : 'border-blue-500'
              }`}></div>
            </div>
          ) : users.length === 0 ? (
            <div className={`text-center p-6 ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No {type} yet
            </div>
          ) : (
            <div className={`divide-y ${
              theme === 'dark-theme' ? 'divide-zinc-800' : 'divide-gray-200'
            }`}>
              {users.map(user => (
                <div 
                  key={user._id} 
                  className={`flex items-center justify-between px-6 py-4 transition-colors duration-200 ${
                    theme === 'dark-theme' 
                      ? 'hover:bg-zinc-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center space-x-4 flex-1"
                    onClick={handleClose}
                  >
                    <img
                      src={getProfileImageUrl(user.profilePicture, user.username)}
                      alt={user.username}
                      className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 ${
                        theme === 'dark-theme' ? 'bg-zinc-900' : 'bg-gray-100'
                      }`}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="font-headlines truncate">
                        {user.username}
                      </div>
                      <div className={`text-sm truncate ${
                        theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.bio || ''}
                      </div>
                    </div>
                  </Link>
                  <div className="flex-shrink-0">
                    <FollowButton
                      userId={user._id}
                      initialIsFollowing={user.isFollowing}
                      onFollowChange={(newFollowState) => handleFollowChangeLocal(newFollowState, user._id)}
                      theme={theme}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;
