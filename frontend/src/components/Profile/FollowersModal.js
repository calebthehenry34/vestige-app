import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import FollowButton from '../Common/FollowButton';
import { Link } from 'react-router-dom';
import { DismissRegular } from '@fluentui/react-icons';

const FollowersModal = ({ isOpen, onClose, userId, type, theme }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
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

  const handleFollowChange = async () => {
    // Re-implement fetchUsers here since we need it for the follow button
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center backdrop-blur-sm">
      <div 
        className={`${
          theme === 'dark-theme' 
            ? 'bg-black border-zinc-800 text-white' 
            : 'bg-white border-gray-200 text-black'
        } w-full max-w-md rounded-t-2xl transform transition-transform duration-300 ease-out shadow-lg ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark-theme' ? 'border-zinc-800' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold">
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

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                theme === 'dark-theme' ? 'border-blue-400' : 'border-blue-500'
              }`}></div>
            </div>
          ) : users.length === 0 ? (
            <div className={`text-center p-4 ${
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
                  className={`flex items-center justify-between p-4 transition-colors duration-200 ${
                    theme === 'dark-theme' 
                      ? 'hover:bg-zinc-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center flex-1"
                    onClick={handleClose}
                  >
                    <img
                      src={getProfileImageUrl(user.profilePicture, user.username)}
                      alt={user.username}
                      className={`w-10 h-10 rounded-full object-cover ${
                        theme === 'dark-theme' ? 'bg-zinc-900' : 'bg-gray-100'
                      }`}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
                      }}
                    />
                    <div className="ml-3">
                      <div className="font-semibold">
                        {user.username}
                      </div>
                      <div className={`text-sm truncate max-w-[200px] ${
                        theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.bio || ''}
                      </div>
                    </div>
                  </Link>
                  <FollowButton
                    userId={user._id}
                    initialIsFollowing={user.isFollowing}
                    onFollowChange={handleFollowChange}
                    theme={theme}
                  />
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
