import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const ChatMessage = ({ message, isOwn }) => {
  const [decryptedContent, setDecryptedContent] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const decryptMessage = async () => {
      try {
        // Decryption will be handled here using the shared secret
        setDecryptedContent(message.content);
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        setDecryptedContent('Unable to decrypt message');
      }
    };

    decryptMessage();
  }, [message]);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm">{decryptedContent}</p>
        <div className="text-xs mt-1 opacity-70">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export const EncryptionStatus = ({ status }) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Establishing secure connection...';
      case 'connected':
        return 'Connection made';
      case 'secured':
        return 'Your chat is secured with end-to-end encryption';
      default:
        return '';
    }
  };

  return (
    <div className="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-lg mb-4">
      {getStatusMessage()}
    </div>
  );
};

export default ChatMessage;
