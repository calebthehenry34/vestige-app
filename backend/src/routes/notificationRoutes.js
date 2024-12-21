import express from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/notification.js';
import mongoose from 'mongoose';
import { processUserWithPresignedUrl } from './userRoutes.js';

const router = express.Router();

// Get user's notifications
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching notifications for user:', req.user.userId);
    
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .lean()
      .exec();

    const processedNotifications = await Promise.all(notifications.map(async notification => {
      // Process sender with pre-signed URL if exists
      if (notification.sender) {
        notification.sender = await processUserWithPresignedUrl(notification.sender);
      }

      notification.post = null;
      notification.commentData = null;
      
      if (notification.post) {
        try {
          const post = await mongoose.model('Post')
            .findById(notification.post)
            .select('media caption')
            .lean()
            .exec();
          
          if (post) {
            notification.post = post;
          }
        } catch (err) {
          console.error('Error populating post:', err);
        }
      }
      
      if (notification?.comment && notification?.post?._id) {
        try {
          const post = await mongoose.model('Post')
            .findById(notification.post._id)
            .lean()
            .exec();
          
          if (post?.comments && Array.isArray(post.comments)) {
            const comment = post.comments.find(c => 
              c && c._id && c._id.toString() === notification.comment.toString()
            );
            
            if (comment) {
              notification.commentData = {
                _id: comment._id,
                text: comment.text
              };
            }
          }
        } catch (err) {
          console.error('Error processing comment:', err);
        }
      }
      
      return notification;
    }));

    res.json(processedNotifications);
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error stack:', error.stack);
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

    // Get populated notification data
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username profilePicture')
      .lean()
      .exec();

    // Process sender with pre-signed URL
    if (populatedNotification.sender) {
      populatedNotification.sender = await processUserWithPresignedUrl(populatedNotification.sender);
    }

    populatedNotification.post = null;
    populatedNotification.commentData = null;

    if (postId) {
      try {
        const post = await mongoose.model('Post')
          .findById(postId)
          .select('media caption')
          .lean()
          .exec();
        
        if (post) {
          populatedNotification.post = post;
        }
      } catch (err) {
        console.error('Error populating post:', err);
      }
    }

    if (commentId && populatedNotification.post?._id) {
      try {
        const post = await mongoose.model('Post')
          .findById(populatedNotification.post._id)
          .lean()
          .exec();
        
        if (post?.comments && Array.isArray(post.comments)) {
          const comment = post.comments.find(c => 
            c && c._id && c._id.toString() === commentId.toString()
          );
          
          if (comment) {
            populatedNotification.commentData = {
              _id: comment._id,
              text: comment.text
            };
          }
        }
      } catch (err) {
        console.error('Error processing comment:', err);
      }
    }

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    io.to(recipientId).emit('notification', populatedNotification);
    
    res.status(201).json(populatedNotification);
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
    .lean()
    .exec();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Process sender with pre-signed URL
    if (notification.sender) {
      notification.sender = await processUserWithPresignedUrl(notification.sender);
    }

    notification.post = null;
    notification.commentData = null;

    if (notification.post) {
      try {
        const post = await mongoose.model('Post')
          .findById(notification.post)
          .select('media caption')
          .lean()
          .exec();
        
        if (post) {
          notification.post = post;
        }
      } catch (err) {
        console.error('Error populating post:', err);
      }
    }

    if (notification?.comment && notification?.post?._id) {
      try {
        const post = await mongoose.model('Post')
          .findById(notification.post._id)
          .lean()
          .exec();
        
        if (post?.comments && Array.isArray(post.comments)) {
          const comment = post.comments.find(c => 
            c && c._id && c._id.toString() === notification.comment.toString()
          );
          
          if (comment) {
            notification.commentData = {
              _id: comment._id,
              text: comment.text
            };
          }
        }
      } catch (err) {
        console.error('Error processing comment:', err);
      }
    }

    res.json(notification);
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
