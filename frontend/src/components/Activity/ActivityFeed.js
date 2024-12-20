import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import FollowButton from '../Common/FollowButton';

const ActivityFeed = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
      setLoading(false);

      // Mark all as read
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const renderActivity = (notification) => {
    const { type, sender, post, createdAt } = notification;

    const baseUserInfo = (
      <div className="flex items-center">
        <img
          src={sender.profilePicture || '/default-avatar.png'}
          alt={sender.username}
          className="w-10 h-10 rounded-full mr-3"
        />
        <div>
          <span className="font-semibold">{sender.username}</span>
        </div>
      </div>
    );

    switch (type) {
      case 'follow':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              {baseUserInfo}
              <span className="ml-1">started following you.</span>
              <div className="text-gray-500 text-sm">{getTimeAgo(createdAt)}</div>
            </div>
            <FollowButton userId={sender._id} />
          </div>
        );

      case 'like':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              {baseUserInfo}
              <span className="ml-1">liked your post.</span>
              <div className="text-gray-500 text-sm">{getTimeAgo(createdAt)}</div>
            </div>
            {post && post.media && (
              <img
                src={post.media}
                alt="Post"
                className="w-12 h-12 object-cover rounded"
              />
            )}
          </div>
        );

      case 'comment':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              {baseUserInfo}
              <span className="ml-1">commented on your post.</span>
              <div className="text-gray-500 text-sm">{getTimeAgo(createdAt)}</div>
            </div>
            {post && post.media && (
              <img
                src={post.media}
                alt="Post"
                className="w-12 h-12 object-cover rounded"
              />
            )}
          </div>
        );

      case 'tag':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              {baseUserInfo}
              <span className="ml-1">tagged you in a post.</span>
              <div className="text-gray-500 text-sm">{getTimeAgo(createdAt)}</div>
            </div>
            {post && post.media && (
              <img
                src={post.media}
                alt="Post"
                className="w-12 h-12 object-cover rounded"
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'all' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'follows' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('follows')}
        >
          Follows
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications
            .filter(notification => activeTab === 'all' || notification.type === 'follow')
            .map(notification => (
              <div key={notification._id}>
                {renderActivity(notification)}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
