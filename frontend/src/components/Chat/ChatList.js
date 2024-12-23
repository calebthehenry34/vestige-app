import React from 'react';

const ChatList = ({ chats, activeChat, onSelectChat }) => {
  return (
    <div className="h-full">
      <div className="overflow-y-auto h-full">
        {chats.map((chat) => (
          <button
            key={chat.userId}
            onClick={() => onSelectChat(chat.userId)}
            className={`w-full p-6 flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors
              ${activeChat === chat.userId ? 'bg-blue-50 dark:bg-gray-600' : ''}`}
          >
            <img
              src={chat.profilePicture || '/api/placeholder/40/40'}
              alt={chat.username}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 text-left">
              <div className="font-semibold dark:text-white flex items-center justify-between">
                <span>{chat.username}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(chat.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                {chat.lastMessage || 'No messages yet'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
