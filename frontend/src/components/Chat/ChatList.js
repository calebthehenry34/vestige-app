import React from 'react';

const ChatList = ({ chats, activeChat, onSelectChat }) => {
  return (
    <div className="h-full dark:bg-black">
      <div className="overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.userId}
            onClick={() => onSelectChat(chat.userId)}
            className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-zinc-900 border-b dark:border-zinc-800
              ${activeChat === chat.userId ? 'bg-blue-50 dark:bg-zinc-800' : ''}`}
          >
            <img
              src={chat.profilePicture || '/api/placeholder/40/40'}
              alt={chat.username}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 text-left">
              <div className="font-medium dark:text-white">{chat.username}</div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                {chat.lastMessage || 'No messages yet'}
              </p>
            </div>
            <div className="text-xs text-gray-400 dark:text-zinc-500">
              {chat.timestamp || 'Just now'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
