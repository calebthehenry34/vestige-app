import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import FollowButton from '../Common/FollowButton';
import { ThemeContext } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { getProfileImageUrl } from '../../utils/imageUtils';
import { DismissRegular, HeartRegular } from '@fluentui/react-icons';
import { NotificationSkeleton } from '../Common/Skeleton';

const ActivityFeed = ({ onClose, isOpen }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const { notifications, setNotifications, updateUnreadCount, markAllAsRead: contextMarkAllAsRead } = useNotifications();
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

  const handleClose = () => {
    onClose();
  };

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
      updateUnreadCount(unreadCount);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  }, [updateUnreadCount, setNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        contextMarkAllAsRead();
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
        updateUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    if (notification.post) {
      navigate(`/post/${notification.post._id}`);
    } else if (notification.type === 'follow' && notification.sender) {
      navigate(`/profile/${notification.sender.username}`);
    }
    handleClose();
  };

  const getNotificationText = (type, commentData) => {
    switch (type) {
      case 'follow':
        return 'started following you';
      case 'like':
        return 'liked your post';
      case 'comment':
        return commentData ? `commented: "${commentData.text}"` : 'commented on your post';
      case 'reply':
        return commentData ? `replied: "${commentData.text}"` : 'replied to your comment';
      case 'commentLike':
        return 'liked your comment';
      case 'tag':
        return commentData ? 'mentioned you in a comment' : 'tagged you in a post';
      default:
        return '';
    }
  };

  const renderActivity = (notification) => {
    const { type, sender, post, commentData, createdAt } = notification;

    if (!sender) {
      return (
        <div className={`flex items-center justify-between px-6 py-4 ${
          theme === 'dark-theme' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="flex items-center space-x-4">
            <img
              src="/default-avatar.png"
              alt="Deleted User"
              className="w-12 h-12 rounded-xl object-cover opacity-50"
            />
            <div>
              <span className="font-headlines">Deleted User</span>
              <div className="text-sm">{getTimeAgo(createdAt)}</div>
            </div>
          </div>
        </div>
      );
    }

    const baseUserInfo = (
      <div className="flex items-center space-x-4 flex-grow">
        <img
          src={getProfileImageUrl(sender.profilePicture, sender.username)}
          alt={sender.username}
          className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 ${
            theme === 'dark-theme' ? 'bg-zinc-900' : 'bg-gray-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${sender.username}`);
          }}
        />
        <div className="flex flex-col min-w-0">
          <div className="font-headlines truncate">
            {sender.username}
          </div>
          <div className={`text-sm truncate ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {getNotificationText(type, commentData)}
          </div>
          <div className={`text-xs ${
            theme === 'dark-theme' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {getTimeAgo(createdAt)}
          </div>
        </div>
      </div>
    );

    return (
      <div 
        className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors duration-200 ${
          theme === 'dark-theme' 
            ? 'hover:bg-zinc-900' 
            : 'hover:bg-gray-50'
        } ${!notification.read ? (
          theme === 'dark-theme' 
            ? 'bg-blue-900/20' 
            : 'bg-blue-50'
        ) : ''}`}
        onClick={() => handleNotificationClick(notification)}
      >
        {baseUserInfo}
        <div className="flex items-center ml-4 flex-shrink-0">
          {type === 'follow' ? (
            <div onClick={e => e.stopPropagation()}>
              <FollowButton 
                userId={sender._id} 
                theme={theme}
              />
            </div>
          ) : post?.media && (
            <img
              src={post.media}
              alt="Post"
              className="w-12 h-12 object-cover rounded-xl"
            />
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-full flex flex-col h-full">
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        theme === 'dark-theme' ? 'border-zinc-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-headlines">Activity</h2>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                theme === 'dark-theme' 
                  ? 'text-gray-400 hover:text-white hover:bg-zinc-900' 
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Dismiss all
            </button>
          )}
        </div>
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

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        ) : notifications.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full p-6 ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <HeartRegular className="w-12 h-12 mb-4 opacity-50" />
            <div className="text-lg font-medium">No notifications yet</div>
            <div className="text-sm">When you get notifications, they'll show up here</div>
          </div>
        ) : (
          <div className={`divide-y ${
            theme === 'dark-theme' ? 'divide-zinc-800' : 'divide-gray-200'
          }`}>
            {notifications.map(notification => (
              <div key={notification._id}>
                {renderActivity(notification)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
