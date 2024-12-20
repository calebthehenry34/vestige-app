import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import FollowButton from '../Common/FollowButton';
import { ThemeContext } from '../../App';

const ActivityFeed = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
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

  const handleNotificationClick = (notification) => {
    if (notification.post) {
      navigate(`/post/${notification.post._id}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.sender.username}`);
    }
  };

  const renderActivity = (notification) => {
    const { type, sender, post, commentData, createdAt } = notification;

    const baseUserInfo = (
      <div className="flex items-center">
        <img
          src={sender.profilePicture || '/default-avatar.png'}
          alt={sender.username}
          className="w-10 h-10 rounded-full mr-3 object-cover"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${sender.username}`);
          }}
        />
        <div>
          <span className={`font-semibold ${
            theme === 'dark-theme' ? 'text-white' : 'text-black'
          }`}>
            {sender.username}
          </span>
        </div>
      </div>
    );

    const getNotificationText = () => {
      switch (type) {
        case 'follow':
          return 'started following you.';
        case 'like':
          return 'liked your post.';
        case 'comment':
          return commentData ? `commented: "${commentData.text}"` : 'commented on your post.';
        case 'reply':
          return commentData ? `replied: "${commentData.text}"` : 'replied to your comment.';
        case 'commentLike':
          return 'liked your comment.';
        case 'tag':
          return commentData ? 'mentioned you in a comment.' : 'tagged you in a post.';
        default:
          return '';
      }
    };

    return (
      <div 
        className={`flex items-center justify-between py-4 cursor-pointer hover:${
          theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-center flex-1">
          {baseUserInfo}
          <div className="ml-1 flex flex-col">
            <span className={theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'}>
              {getNotificationText()}
            </span>
            <div className={`text-sm ${
              theme === 'dark-theme' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {getTimeAgo(createdAt)}
            </div>
          </div>
        </div>
        {type === 'follow' ? (
          <div onClick={e => e.stopPropagation()}>
            <FollowButton userId={sender._id} />
          </div>
        ) : post?.media && (
          <img
            src={post.media}
            alt="Post"
            className="w-12 h-12 object-cover rounded"
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`mb-50 max-w-2xl mx-auto px-4 py-8 text-center ${
        theme === 'dark-theme' ? 'text-white' : 'text-black'
      }`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto px-4 mb-50 font-headlines ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-white'
    }`}>
      {/* Tabs */}
      <div className={`flex border-b mb-4 ${
        theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'all' 
              ? theme === 'dark-theme'
                ? 'border-b-2 border-white text-white'
                : 'border-b-2 border-black text-black'
              : theme === 'dark-theme'
                ? 'text-gray-500'
                : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'follows'
              ? theme === 'dark-theme'
                ? 'border-b-2 border-white text-white'
                : 'border-b-2 border-black text-black'
              : theme === 'dark-theme'
                ? 'text-gray-500'
                : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('follows')}
        >
          Follows
        </button>
      </div>

      {/* Activity List */}
      <div className={`divide-y ${
        theme === 'dark-theme' ? 'divide-gray-800' : 'divide-gray-200'
      }`}>
        {notifications.length === 0 ? (
          <div className={`py-8 text-center ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`}>
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
