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

  return (
    <div 
      className={`fixed top-[64px] left-0 right-0 z-20 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-10px] pointer-events-none'
      }`}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      <div className="max-w-xl mx-auto px-4 py-2">
        <div className="bg-[#000] rounded-lg p-4 shadow-lg">
          <div className="text-lg font-headlines text-white mb-2">
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
