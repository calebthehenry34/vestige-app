import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import FollowButton from '../Common/FollowButton';
import { ThemeContext } from '../../App';

const ActivityFeed = ({ onClose, isOpen, onNotificationsUpdate }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
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
      const unreadCount = data.filter(n => !n.read).length;
      if (onNotificationsUpdate) {
        onNotificationsUpdate(unreadCount);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  }, [onNotificationsUpdate]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        if (onNotificationsUpdate) {
          onNotificationsUpdate(0);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
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

  const handleNotificationClick = async (notification) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/${notification._id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n._id === notification._id ? { ...n, read: true } : n
        ));
        const unreadCount = notifications.filter(n => !n.read && n._id !== notification._id).length;
        if (onNotificationsUpdate) {
          onNotificationsUpdate(unreadCount);
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    if (notification.post) {
      navigate(`/post/${notification.post._id}`);
    } else if (notification.type === 'follow' && notification.sender) {
      navigate(`/profile/${notification.sender.username}`);
    }
    onClose();
  };

  const renderActivity = (notification) => {
    const { type, sender, post, commentData, createdAt } = notification;

    if (!sender) {
      return (
        <div className={`mb-50 flex items-center justify-between py-4 ${
          theme === 'dark-theme' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="flex items-center">
            <img
              src="/default-avatar.png"
              alt="Deleted User"
              className="w-10 h-10 rounded-full mr-3 object-cover opacity-50"
            />
            <div>
              <span className="font-semibold">Deleted User</span>
              <div className="text-sm">{getTimeAgo(createdAt)}</div>
            </div>
          </div>
        </div>
      );
    }

    const baseUserInfo = (
      <div className="flex items-center">
        <img
          src={sender.profilePicture ? `${API_URL}${sender.profilePicture}` : '/default-avatar.png'}
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
        } ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
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
            className="w-12 h-12 object-cover rounded-md"
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`activity-modal mb-50 max-w-2xl mx-auto px-4 py-8 text-center ${
        theme === 'dark-theme' ? 'text-white' : 'text-black'
      }`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="activity-modal-overlay">
      <div className={`activity-modal max-w-2xl mx-auto ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-white'
      }`}>
        <div className={`card-header flex justify-between items-center`}>
          <h2 className={`text-lg font-headlines ${
            theme === 'dark-theme' ? 'text-white' : 'text-black'
          }`}>
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="activity-modal-content p-6">
          {/* Mark all as read button */}
          {notifications.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={markAllAsRead}
                className={`text-sm px-3 py-1 rounded ${
                  theme === 'dark-theme' 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className={`flex border-b mb-4 ${
            theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <button
              className={`px-8 py-4 font-headlines ${
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
          <div className={`notifications-list divide-y ${
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
      </div>
    </div>
  );
};

export default ActivityFeed;
