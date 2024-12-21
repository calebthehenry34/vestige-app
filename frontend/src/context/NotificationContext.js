import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Connect to WebSocket server
      const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
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
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const clearCurrentNotification = () => {
    setCurrentNotification(null);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        setNotifications,
        currentNotification,
        clearCurrentNotification
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
