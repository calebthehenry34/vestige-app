import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import FollowButton from '../Common/FollowButton';
import { Link } from 'react-router-dom';
import { DismissRegular } from '@fluentui/react-icons';

const FollowersModal = ({ isOpen, onClose, userId, type }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <DismissRegular className="w-6 h-6" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              No {type} yet
            </div>
          ) : (
            <div className="divide-y">
              {users.map(user => (
                <div key={user._id} className="flex items-center justify-between p-4">
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center flex-1"
                    onClick={onClose}
                  >
                    <img
                      src={getProfileImageUrl(user.profilePicture, user.username)}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`;
                      }}
                    />
                    <div className="ml-3">
                      <div className="font-semibold">{user.username}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
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
