import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const WelcomeMessage = ({ isVisible }) => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting('Good morning');
      } else if (hour < 18) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    };

    updateGreeting();
    // Update greeting every minute
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-[64px] left-0 right-0 z-30"
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 shadow-lg">
          <div className="text-lg font-medium text-white mb-2">
            {greeting}, {user?.username}!
          </div>
          <div className="text-gray-400">
            {notifications.length > 0 
              ? `You have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`
              : 'No new notifications'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
