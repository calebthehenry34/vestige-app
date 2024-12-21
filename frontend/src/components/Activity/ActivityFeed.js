import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import FollowButton from '../Common/FollowButton';
import { ThemeContext } from '../../App';
import { getProfileImageUrl } from '../../utils/imageUtils';
import { DismissRegular } from '@fluentui/react-icons';

const ActivityFeed = ({ onClose, isOpen, onNotificationsUpdate }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
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

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
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
          <div className="flex items-center">
            <img
              src="/default-avatar.png"
              alt="Deleted User"
              className="w-12 h-12 rounded-xl mr-4 object-cover opacity-50"
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
      <div className="flex items-center space-x-4">
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
          <div className="font-semibold truncate">
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
        <div className="flex items-center space-x-4 flex-shrink-0">
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
          <h2 className="text-xl font-semibold">Activity</h2>
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

        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-6">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                theme === 'dark-theme' ? 'border-blue-400' : 'border-blue-500'
              }`}></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className={`text-center p-6 ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No notifications yet
            </div>
          ) : (
            <>
              {notifications.length > 0 && (
                <div className={`flex justify-end px-6 py-2 border-b ${
                  theme === 'dark-theme' ? 'border-zinc-800' : 'border-gray-200'
                }`}>
                  <button
                    onClick={markAllAsRead}
                    className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                      theme === 'dark-theme' 
                        ? 'text-gray-400 hover:text-white hover:bg-zinc-900' 
                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    Mark all as read
                  </button>
                </div>
              )}
              <div className={`divide-y ${
                theme === 'dark-theme' ? 'divide-zinc-800' : 'divide-gray-200'
              }`}>
                {notifications.map(notification => (
                  <div key={notification._id}>
                    {renderActivity(notification)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;
