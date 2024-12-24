import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const useSocket = () => {
  const socket = useRef();
  const { user } = useAuth();

  useEffect(() => {
    if (user?._id) {
      // Connect to socket server
      socket.current = io(SOCKET_SERVER_URL, {
        withCredentials: true,
      });

      // Join user's chat room
      socket.current.emit('join_chat', user._id);

      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, [user]);

  const sendMessage = useCallback((data) => {
    if (socket.current) {
      socket.current.emit('send_message', data);
    }
  }, []);

  const onReceiveMessage = useCallback((callback) => {
    if (socket.current) {
      socket.current.on('receive_message', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('receive_message', callback);
      }
    };
  }, []);

  const updateTypingStatus = useCallback((data) => {
    if (socket.current) {
      socket.current.emit('typing', data);
    }
  }, []);

  const onTypingStatus = useCallback((callback) => {
    if (socket.current) {
      socket.current.on('user_typing', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('user_typing', callback);
      }
    };
  }, []);

  const updateEncryptionStatus = useCallback((data) => {
    if (socket.current) {
      socket.current.emit('encryption_status', data);
    }
  }, []);

  const onEncryptionStatus = useCallback((callback) => {
    if (socket.current) {
      socket.current.on('encryption_update', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('encryption_update', callback);
      }
    };
  }, []);

  return {
    socket: socket.current,
    sendMessage,
    onReceiveMessage,
    updateTypingStatus,
    onTypingStatus,
    updateEncryptionStatus,
    onEncryptionStatus,
  };
};

export default useSocket;
