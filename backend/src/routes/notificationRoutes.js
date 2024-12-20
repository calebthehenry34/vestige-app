import express from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/notification.js';

const router = express.Router();

// Get user's notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .populate('post', 'media caption')
      .populate({
        path: 'comment',
        select: 'text user replies',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create a notification
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, type, postId, commentId } = req.body;
    
    // Don't create notification if sender is recipient
    if (recipientId === req.user.userId) {
      return res.status(200).json({ message: 'Self notification skipped' });
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user.userId,
      type,
      post: postId,
      comment: commentId,
      read: false
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username profilePicture')
      .populate('post', 'media caption')
      .populate({
        path: 'comment',
        select: 'text user replies',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      });
    
    res.status(201).json(populatedNotification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { read: true },
      { new: true }
    )
    .populate('sender', 'username profilePicture')
    .populate('post', 'media caption')
    .populate({
      path: 'comment',
      select: 'text user replies',
      populate: [
        {
          path: 'user',
          select: 'username profilePicture'
        },
        {
          path: 'replies',
          populate: {
            path: 'user',
            select: 'username profilePicture'
          }
        }
      ]
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      read: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Delete notifications for a post
router.delete('/post/:postId', auth, async (req, res) => {
  try {
    await Notification.deleteMany({
      post: req.params.postId,
      recipient: req.user.userId
    });

    res.json({ message: 'Post notifications deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// Delete notifications for a comment
router.delete('/comment/:commentId', auth, async (req, res) => {
  try {
    await Notification.deleteMany({
      comment: req.params.commentId,
      recipient: req.user.userId
    });

    res.json({ message: 'Comment notifications deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

export default router;
