import React, { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Toast = ({ notification, onClose }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClick = () => {
    onClose();
    if (notification.post) {
      navigate(`/post/${notification.post._id}`);
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[1000] max-w-sm w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden transition-all transform animate-slide-in ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      }`}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start">
          {notification.sender?.profilePicture && (
            <img
              className="h-10 w-10 rounded-full object-cover mr-3"
              src={notification.sender.profilePicture}
              alt={notification.sender.username}
            />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="font-bold">{notification.sender?.username}</span>
              {' '}
              {notification.type === 'like' && 'liked your post'}
              {notification.type === 'comment' && 'commented on your post'}
              {notification.type === 'follow' && 'started following you'}
            </p>
            {notification.commentData?.text && (
              <p className={`mt-1 text-sm ${
                theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {notification.commentData.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
