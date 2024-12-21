import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { useNotifications } from '../../context/NotificationContext';

const Toast = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const { currentNotification, clearCurrentNotification } = useNotifications();

  useEffect(() => {
    if (currentNotification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearCurrentNotification, 300); // Wait for fade out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentNotification, clearCurrentNotification]);

  if (!currentNotification) return null;

  const handleClick = () => {
    if (currentNotification.post) {
      navigate(`/post/${currentNotification.post._id}`);
    } else if (currentNotification.type === 'follow' && currentNotification.sender) {
      navigate(`/profile/${currentNotification.sender.username}`);
    }
    setIsVisible(false);
    setTimeout(clearCurrentNotification, 300);
  };

  const getNotificationText = () => {
    const username = currentNotification.sender?.username || 'Someone';
    switch (currentNotification.type) {
      case 'follow':
        return `${username} started following you`;
      case 'like':
        return `${username} liked your post`;
      case 'comment':
        return `${username} commented on your post`;
      case 'reply':
        return `${username} replied to your comment`;
      case 'commentLike':
        return `${username} liked your comment`;
      case 'tag':
        return `${username} tagged you in a post`;
      default:
        return '';
    }
  };

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div
        onClick={handleClick}
        className={`cursor-pointer rounded-lg shadow-lg px-4 py-3 flex items-center space-x-3 max-w-sm ${
          theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {currentNotification.sender?.profilePicture && (
          <img
            src={currentNotification.sender.profilePicture}
            alt={currentNotification.sender.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <span className={theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}>
          {getNotificationText()}
        </span>
      </div>
    </div>
  );
};

export default Toast;
