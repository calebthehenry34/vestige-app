import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import FollowButton from '../Common/FollowButton';
import { Link } from 'react-router-dom';
import { DismissRegular } from '@fluentui/react-icons';

const FollowersModal = ({ isOpen, onClose, userId, type }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[200] flex items-end justify-center">
      <div 
        className={`bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <DismissRegular className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              No {type} yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => (
                <div key={user._id} className="flex items-center justify-between p-4">
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center flex-1"
                    onClick={handleClose}
                  >
                    <img
                      src={getProfileImageUrl(user.profilePicture, user.username)}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
                      }}
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {user.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {user.bio || ''}
                      </div>
                    </div>
                  </Link>
                  <FollowButton
                    userId={user._id}
                    initialIsFollowing={user.isFollowing}
                    onFollowChange={() => {}}
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
