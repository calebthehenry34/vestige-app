// backend/src/controllers/messageController.js
import Message from '../models/message.js';

export const sendMessage = async (req, res) => {
  try {
    const { recipientId, encryptedContent, iv } = req.body;
    
    const message = new Message({
      sender: req.user.userId,
      recipient: recipientId,
      encryptedContent,
      iv,
      salt: crypto.randomBytes(16).toString('hex')
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Error sending message' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.user.userId }
      ]
    }).sort('createdAt');
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

// backend/src/controllers/messageController.js
export const getChats = async (req, res) => {
    try {
      // Find all unique conversations for the user
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: req.user.userId },
              { recipient: req.user.userId }
            ]
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$sender', req.user.userId] },
                '$recipient',
                '$sender'
              ]
            },
            lastMessage: { $first: '$encryptedContent' },
            updatedAt: { $first: '$createdAt' }
          }
        }
      ]);
  
      // Get user details for each conversation
      const chats = await Promise.all(
        conversations.map(async (conv) => {
          const otherUser = await User.findById(conv._id)
            .select('username profilePicture');
          return {
            userId: otherUser._id,
            username: otherUser.username,
            profilePicture: otherUser.profilePicture,
            lastMessage: conv.lastMessage,
            updatedAt: conv.updatedAt
          };
        })
      );
  
      res.json(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Error fetching chats' });
    }
  };