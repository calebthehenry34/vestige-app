import React from 'react';

const ChatMessage = ({ message, isOwnMessage }) => {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className="flex flex-col">
        <div
          className={`max-w-[70%] p-4 rounded-2xl ${
            isOwnMessage
              ? 'bg-blue-500 text-white ml-auto rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        <span className={`text-xs text-gray-500 mt-1 ${
          isOwnMessage ? 'text-right' : 'text-left'
        }`}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
