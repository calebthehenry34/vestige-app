// frontend/src/components/Chat/ChatList.js
import React from 'react';

const ChatList = ({ chats, activeChat, onSelectChat }) => {
  return (
    <div className="w-80 border-r h-full bg-white">
      <div className="p-4 border-b">
        <h2 className="text-2xl font-semibold">Messages</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100%-73px)]">
        {chats.map((chat) => (
          <button
            key={chat.userId}
            onClick={() => onSelectChat(chat.userId)}
            className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 border-b
              ${activeChat === chat.userId ? 'bg-blue-50' : ''}`}
          >
            <img
              src={chat.profilePicture || '/api/placeholder/40/40'}
              alt={chat.username}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 text-left">
              <div className="font-medium">{chat.username}</div>
              <p className="text-sm text-gray-500 truncate">
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