import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatList from './ChatList';
import { 
    SearchRegular, 
    ArrowRightRegular, 
    DismissRegular,
    AddRegular 
  } from '@fluentui/react-icons';
import { API_URL } from '../../config';
import ChatMessage from './ChatMessage';

const Chat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const initializeEncryption = React.useCallback(async () => {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    setEncryptionKey(key);
  }, []);

  const fetchChats = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/chats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();
      setChats(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load chats:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeEncryption();
      await fetchChats();
    };
    init();
  }, [initializeEncryption, fetchChats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const decryptMessage = React.useCallback(async (encryptedContent, iv) => {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(atob(iv).split('').map((c) => c.charCodeAt(0))),
      },
      encryptionKey,
      new Uint8Array(atob(encryptedContent).split('').map((c) => c.charCodeAt(0)))
    );

    return new TextDecoder().decode(decryptedData);
  }, [encryptionKey]);

  const fetchMessages = React.useCallback(async () => {
    if (!activeChat || !encryptionKey) return;
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
      console.error('Failed to load messages:', err);
    }
  }, [activeChat, encryptionKey, decryptMessage]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat, fetchMessages]);

  const encryptMessage = React.useCallback(async (message) => {
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
  }, [encryptionKey]);

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

      const response = await fetch(`${API_URL}/api/messages`, {
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
      console.error('Failed to send message:', err);
    } finally {
      setNewMessage('');
    }
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
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <h1 className="text-4xl font-bold mb-4">Chat</h1>
      <p className="text-gray-600 mb-8">Connect with your friends through private messages</p>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden" style={{ height: '75vh' }}>
        <div className="flex h-full">
          {/* Chat List */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 h-full bg-gray-50 dark:bg-gray-900">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold dark:text-white">Messages</h2>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="New Chat"
              >
                <AddRegular className="w-5 h-5 dark:text-white" />
              </button>
            </div>

            <ChatList 
              chats={chats}
              activeChat={activeChat}
              onSelectChat={setActiveChat}
            />
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                  <button 
                    onClick={() => setActiveChat(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2"
                  >
                    <ArrowRightRegular className="w-5 h-5 transform rotate-180 dark:text-white" />
                  </button>
                  <div className="flex-1 flex items-center">
                    <img
                      src={chats.find(chat => chat.userId === activeChat)?.profilePicture || '/api/placeholder/40/40'}
                      alt="Profile"
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-semibold dark:text-white">
                        {chats.find(chat => chat.userId === activeChat)?.username}
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Online</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <svg className="w-5 h-5 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message._id}
                      message={message}
                      isOwnMessage={message.sender === user.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <form onSubmit={sendMessage} className="flex items-center space-x-3">
                    <button 
                      type="button" 
                      onClick={() => {/* TODO: Implement emoji picker */}}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <span role="img" aria-label="emoji" className="text-xl">😊</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => {/* TODO: Implement image upload */}}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <svg className="w-6 h-6 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 rounded-full border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Type a message..."
                    />
                    <button
                      type="submit"
                      className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-900">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-96 max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">New Chat</h3>
              <button 
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
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
                  className="flex-1 outline-none border-b p-2 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleStartChat(user._id)}
                    className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <img
                      src={user.profilePicture || '/api/placeholder/40/40'}
                      alt={user.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium dark:text-white">{user.username}</div>
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
