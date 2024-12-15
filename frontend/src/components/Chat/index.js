import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatList from './ChatList';
import { 
    SearchRegular, 
    ArrowRightRegular, 
    ShieldLockRegular,
    DismissRegular,
    AddRegular 
  } from '@fluentui/react-icons';
  import { API_URL } from '../../config';

const Chat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);


  useEffect(() => {
    initializeEncryption();
    fetchChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  const initializeEncryption = async () => {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    setEncryptionKey(key);
  };

  const encryptMessage = async (message) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      encryptionKey,
      encodedMessage
    );

    return {
      encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  };

  const decryptMessage = async (encryptedContent, iv) => {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(atob(iv).split('').map((c) => c.charCodeAt(0))),
      },
      encryptionKey,
      new Uint8Array(atob(encryptedContent).split('').map((c) => c.charCodeAt(0)))
    );

    return new TextDecoder().decode(decryptedData);
  };

  const fetchChats = async () => {
    try {
      const response = await fetch('${API_URL}/api/messages/chats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();
      setChats(data);
      setLoading(false);
    } catch (err) {
      setError('Unable to load chats. Please try again.');
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/${activeChat}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch messages');

      const encryptedMessages = await response.json();
      const decryptedMessages = await Promise.all(
        encryptedMessages.map(async (msg) => ({
          ...msg,
          content: await decryptMessage(msg.encryptedContent, msg.iv),
        }))
      );

      setMessages(decryptedMessages);
      scrollToBottom();
    } catch (err) {
      setError('Unable to load messages. Please try again.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const tempMessage = {
      _id: Date.now(),
      sender: user.id,
      content: newMessage,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const { encryptedContent, iv } = await encryptMessage(newMessage);

      const response = await fetch('${API_URL}/api/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: activeChat,
          encryptedContent,
          iv,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      fetchMessages();
      fetchChats();
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      setError('Unable to send message. Please try again.');
    } finally {
      setNewMessage('');
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const searchProfiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profiles?search=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to search profiles');

      const results = await response.json();
      setSearchResults(results);
    } catch (err) {
      setError('Unable to search profiles. Please try again.');
    }
  };

  const startNewChat = (recipientId) => {
    setActiveChat(recipientId);
    setSearchResults([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/search?term=${term}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleStartChat = async (userId) => {
    setActiveChat(userId);
    setShowNewChatModal(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '80vh' }}>
        <div className="flex h-full">
          {/* Chat List */}
          <div className="w-80 border-r h-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Messages</h2>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="New Chat"
              >
                <AddRegular className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-65px)]">
              {chats.map((chat) => (
                <button
                  key={chat.userId}
                  onClick={() => setActiveChat(chat.userId)}
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

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeChat ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.sender === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender === user.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type a message..."
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">New Chat</h3>
              <button 
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <DismissRegular className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <SearchRegular className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search users..."
                  className="flex-1 outline-none border-b p-2"
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleStartChat(user._id)}
                    className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 rounded-lg"
                  >
                    <img
                      src={user.profilePicture || '/api/placeholder/40/40'}
                      alt={user.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{user.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
