import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useScroll } from '../../context/ScrollContext';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

const WelcomeMessage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { scrollY } = useScroll();
  const [greeting, setGreeting] = useState('');
  const [followRequests, setFollowRequests] = useState(0);

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

  useEffect(() => {
    const fetchFollowRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/follow-requests`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setFollowRequests(data.length);
        }
      } catch (error) {
        console.error('Error fetching follow requests:', error);
      }
    };
    fetchFollowRequests();
  }, []);

  // Calculate opacity based on scroll position
  const opacity = Math.max(0, 1 - (scrollY / 100));

  return (
    <div 
      className="welcome-message px-4 py-6"
      style={{ 
        opacity,
        transform: `translateY(${-scrollY * 0.3}px)`,
        pointerEvents: opacity === 0 ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-out'
      }}
    >
      <div className="text-xl font-headlines text-white mb-2">
        {greeting}, {user?.username}
      </div>
      <button 
        onClick={() => navigate('/activity')}
        className="text-gray-400 hover:text-gray-200 text-sm transition-colors cursor-pointer"
      >
        You have {unreadCount} {unreadCount === 1 ? 'notification' : 'notifications'}
      </button>
      <div className="text-gray-400 text-sm">
        You have {followRequests} follow requests
      </div>
    </div>
  );
};

export default WelcomeMessage;
