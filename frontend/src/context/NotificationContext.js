import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentNotification, setCurrentNotification] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Get the base URL without any path
      const baseUrl = process.env.REACT_APP_API_URL.replace(/\/+$/, '');
      
      // Connect to WebSocket server
      const socket = io(baseUrl, {
        withCredentials: true,
        transports: ['websocket'], // Try websocket first
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true, // Force a new connection
        path: '/socket.io', // Explicitly set Socket.IO path
        extraHeaders: {
          'Access-Control-Allow-Credentials': 'true'
        }
      });

      socket.on('connect', () => {
        console.log('Connected to notification socket');
        // Join user's notification room
        socket.emit('join', user._id);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Fallback to polling if websocket fails
        if (socket.io.opts.transports[0] === 'websocket') {
          console.log('Falling back to polling transport');
          socket.io.opts.transports = ['polling', 'websocket'];
        }
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        if (user._id) {
          socket.emit('join', user._id);
        }
      });

      socket.on('notification', (notification) => {
        setCurrentNotification(notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const clearCurrentNotification = () => {
    setCurrentNotification(null);
  };

  const updateUnreadCount = (count) => {
    setUnreadCount(count);
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        setNotifications,
        currentNotification,
        clearCurrentNotification,
        unreadCount,
        updateUnreadCount,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
