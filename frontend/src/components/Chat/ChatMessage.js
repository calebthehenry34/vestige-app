import React from 'react';

export const EncryptionStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'text-yellow-500';
      case 'connected':
        return 'text-blue-500';
      case 'secured':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Establishing secure connection...';
      case 'connected':
        return 'Connection established';
      case 'secured':
        return 'Messages are end-to-end encrypted';
      case 'error':
        return 'Failed to establish secure connection';
      default:
        return 'Waiting to connect...';
    }
  };

  return (
    <div className={`text-sm mb-4 flex items-center justify-center ${getStatusColor()}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
        <span>{getStatusText()}</span>
      </div>
    </div>
  );
};

const ChatMessage = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className="flex flex-col">
        <div
          className={`max-w-[70%] p-4 rounded-2xl ${
            isOwn
              ? 'bg-blue-500 text-white ml-auto rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        <span className={`text-xs text-gray-500 mt-1 ${
          isOwn ? 'text-right' : 'text-left'
        }`}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
