import express from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/notification.js';

const router = express.Router();

// Get user's notifications
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching notifications for user:', req.user.userId);
    
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .populate('post', 'media caption comments');

    // Process notifications to handle potentially missing comments
    const processedNotifications = notifications.map(notification => {
      const notificationObj = notification.toObject();
      
      // If this notification involves a comment and has a post
      if (notificationObj.comment && notificationObj.post?.comments) {
        // Find the matching comment in the post's comments array
        const comment = notificationObj.post.comments.find(
          c => c._id.toString() === notificationObj.comment.toString()
        );
        
        // If comment exists, include it, otherwise set to null
        notificationObj.comment = comment || null;
        
        // Remove the comments array from the post to avoid sending unnecessary data
        if (notificationObj.post) {
          delete notificationObj.post.comments;
        }
      }
      
      return notificationObj;
    });

    console.log('Successfully processed notifications');
    res.json(processedNotifications);
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
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
      .populate('post', 'media caption');

    // Process notification to handle comment data
    const processedNotification = populatedNotification.toObject();
    if (processedNotification.comment && processedNotification.post) {
      const comment = processedNotification.post.comments?.find(
        c => c._id.toString() === processedNotification.comment.toString()
      );
      processedNotification.comment = comment || null;
    }
    
    res.status(201).json(processedNotification);
  } catch (error) {
    console.error('Notification creation error:', error);
    res.status(500).json({ error: 'Failed to create notification', details: error.message });
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
    .populate('post', 'media caption');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Process notification to handle comment data
    const processedNotification = notification.toObject();
    if (processedNotification.comment && processedNotification.post) {
      const comment = processedNotification.post.comments?.find(
        c => c._id.toString() === processedNotification.comment.toString()
      );
      processedNotification.comment = comment || null;
    }

    res.json(processedNotification);
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ error: 'Failed to update notification', details: error.message });
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
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications', details: error.message });
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
    console.error('Notification deletion error:', error);
    res.status(500).json({ error: 'Failed to delete notification', details: error.message });
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
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count', details: error.message });
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
    console.error('Post notifications deletion error:', error);
    res.status(500).json({ error: 'Failed to delete notifications', details: error.message });
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
    console.error('Comment notifications deletion error:', error);
    res.status(500).json({ error: 'Failed to delete notifications', details: error.message });
  }
});

export default router;
