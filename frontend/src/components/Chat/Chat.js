import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatList from './ChatList';
import ChatMessage, { EncryptionStatus } from './ChatMessage';
import { MessageEncryption } from '../../utils/messageEncryption';
import useSocket from '../../hooks/useSocket';

const Chat = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [encryptionStatus, setEncryptionStatus] = useState('');
  const [sharedSecret, setSharedSecret] = useState(null);
  const [keyPair, setKeyPair] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, loading } = useAuth();
  const {
    sendMessage: socketSendMessage,
    onReceiveMessage,
    updateTypingStatus,
    onTypingStatus,
    updateEncryptionStatus,
    onEncryptionStatus,
  } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;
    try {
      const response = await fetch(`/api/messages/${activeChat}`);
      const data = await response.json();
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [activeChat]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats');
        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      setEncryptionStatus('connecting');
      updateEncryptionStatus({
        recipientId: activeChat,
        senderId: user._id,
        status: 'connecting'
      });
      
      const initializeEncryption = async () => {
        try {
          // Generate key pair for the current user if not exists
          if (!keyPair) {
            const newKeyPair = MessageEncryption.generateKeyPair();
            setKeyPair(newKeyPair);
          }

          // Exchange public keys and establish shared secret
          const response = await fetch(`/api/chats/${activeChat}/keys`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publicKey: keyPair.publicKey }),
          });

          const { otherPublicKey } = await response.json();
          setEncryptionStatus('connected');
          updateEncryptionStatus({
            recipientId: activeChat,
            senderId: user._id,
            status: 'connected'
          });

          const secret = await MessageEncryption.generateSharedSecret(
            keyPair.privateKey,
            otherPublicKey
          );
          setSharedSecret(secret);
          setEncryptionStatus('secured');
          updateEncryptionStatus({
            recipientId: activeChat,
            senderId: user._id,
            status: 'secured'
          });

          // Fetch messages after encryption is set up
          fetchMessages();
        } catch (error) {
          console.error('Failed to initialize encryption:', error);
          setEncryptionStatus('error');
        }
      };

      initializeEncryption();
    }
  }, [activeChat, keyPair, updateEncryptionStatus, user._id, fetchMessages]);

  useEffect(() => {
    const handleEncryptionStatus = (data) => {
      if (data.senderId === activeChat) {
        setEncryptionStatus(data.status);
      }
    };

    const cleanup = onEncryptionStatus(handleEncryptionStatus);
    return () => cleanup();
  }, [activeChat, onEncryptionStatus]);

  useEffect(() => {
    const handleReceiveMessage = async (data) => {
      if (data.senderId === activeChat) {
        try {
          const decryptedMessage = await MessageEncryption.decryptMessage(
            data.message,
            sharedSecret
          );
          setMessages((prev) => [...prev, { ...data.message, content: decryptedMessage }]);
          scrollToBottom();
        } catch (error) {
          console.error('Failed to decrypt received message:', error);
        }
      }
    };

    const cleanup = onReceiveMessage(handleReceiveMessage);
    return () => cleanup();
  }, [activeChat, sharedSecret, onReceiveMessage]);

  useEffect(() => {
    const handleTypingStatus = (data) => {
      if (data.senderId === activeChat) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const cleanup = onTypingStatus(handleTypingStatus);
    return () => cleanup();
  }, [activeChat, onTypingStatus]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus({ recipientId: activeChat, senderId: user._id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus({ recipientId: activeChat, senderId: user._id, isTyping: false });
    }, 2000);
  }, [isTyping, activeChat, user._id, updateTypingStatus]);

  // Prevent access to chat when not authenticated
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="flex h-screen items-center justify-center">Please log in to access chat</div>;
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !sharedSecret) return;

    try {
      const encrypted = await MessageEncryption.encryptMessage(
        newMessage,
        sharedSecret
      );

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: activeChat,
          ...encrypted,
        }),
      });

      const message = await response.json();
      setMessages([...messages, message]);
      setNewMessage('');
      scrollToBottom();

      // Send through socket for real-time updates
      socketSendMessage({
        recipientId: activeChat,
        senderId: user._id,
        message: encrypted,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex h-screen pt-16">
      <ChatList
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
      />
      
      <div className="flex-1 flex flex-col h-full">
        {activeChat ? (
          <>
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold">
                {chats.find((chat) => chat.userId === activeChat)?.username}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <EncryptionStatus status={encryptionStatus} />
              
              {messages.map((message) => (
                <ChatMessage
                  key={message._id}
                  message={message}
                  isOwn={message.sender === user._id}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              {otherUserTyping && (
                <div className="text-sm text-gray-500 mb-2">
                  {chats.find((chat) => chat.userId === activeChat)?.username} is typing...
                </div>
              )}
              <form onSubmit={sendMessage} className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!sharedSecret}
                  className="bg-blue-500 text-white rounded-full px-6 py-2 hover:bg-blue-600 focus:outline-none disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
