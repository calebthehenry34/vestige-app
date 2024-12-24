import express from 'express';
import auth from '../middleware/auth.js';
import Message from '../models/message.js';
import User from '../models/User.js';

const router = express.Router();

// Get all chats for the current user
router.get('/chats', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate('sender recipient', 'username profilePicture');

    const chats = messages.reduce((acc, msg) => {
      const otherUser = msg.sender._id.equals(req.user._id)
        ? msg.recipient
        : msg.sender;

      if (!acc.some((chat) => chat.userId.equals(otherUser._id))) {
        acc.push({
          userId: otherUser._id,
          username: otherUser.username,
          profilePicture: otherUser.profilePicture,
          lastMessage: msg.encryptedContent,
          lastMessageDate: msg.createdAt,
        });
      }
      return acc;
    }, []);

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// Get messages for a specific chat
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender recipient', 'username profilePicture');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Store public key for key exchange
const keyExchange = new Map();

// Handle key exchange
router.post('/chats/:userId/keys', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { publicKey } = req.body;

    // Store the public key
    const chatId = [req.user._id, userId].sort().join(':');
    if (!keyExchange.has(chatId)) {
      keyExchange.set(chatId, {});
    }
    
    const exchange = keyExchange.get(chatId);
    exchange[req.user._id] = publicKey;

    // If we have both keys, return the other user's public key
    if (exchange[userId]) {
      res.json({ otherPublicKey: exchange[userId] });
    } else {
      res.json({ message: 'Waiting for other user\'s key' });
    }
  } catch (error) {
    console.error('Error in key exchange:', error);
    res.status(500).json({ message: 'Error in key exchange' });
  }
});

// Send a new message
router.post('/messages', auth, async (req, res) => {
  try {
    const { recipientId, encryptedContent, iv, salt } = req.body;

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      encryptedContent,
      iv,
      salt,
    });

    await message.save();
    await message.populate('sender recipient', 'username profilePicture');

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Mark messages as read
router.put('/messages/:userId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.userId,
        recipient: req.user._id,
        read: false,
      },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

export default router;
