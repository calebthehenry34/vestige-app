import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { API_URL } from '../../config';

const WelcomeMessage = () => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
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

  return (
    <div className="px-4 py-6">
      <div className="text-xl font-medium text-white mb-2">
        {greeting}, {user?.username}
      </div>
      <div className="text-gray-400 text-sm">
        You have {notifications.length} unread notifications
      </div>
      <div className="text-gray-400 text-sm">
        You have {followRequests} follow requests
      </div>
    </div>
  );
};

export default WelcomeMessage;
