import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Notification from '../models/notification.js';

const router = express.Router();

// Get all users
router.get('/suggestions', auth, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user.userId } },
      'username profilePicture bio'
    ).limit(20);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Follow a user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.user.userId,
      following: req.params.userId
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create new follow relationship
    const follow = new Follow({
      follower: req.user.userId,
      following: req.params.userId
    });

    await follow.save();

    // Create follow notification
    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.userId,
      type: 'follow'
    });

    // Update follower counts
    await User.findByIdAndUpdate(req.user.userId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(req.params.userId, { $inc: { followersCount: 1 } });

    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Error following user' });
  }
});

// Unfollow a user
router.delete('/follow/:userId', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    if (!userToUnfollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find and delete the follow relationship
    const deletedFollow = await Follow.findOneAndDelete({
      follower: req.user.userId,
      following: req.params.userId
    });

    if (!deletedFollow) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    // Remove follow notification if exists
    await Notification.deleteOne({
      recipient: req.params.userId,
      sender: req.user.userId,
      type: 'follow'
    });

    // Update follower counts
    await User.findByIdAndUpdate(req.user.userId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(req.params.userId, { $inc: { followersCount: -1 } });

    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Error unfollowing user' });
  }
});

// Get user's followers
router.get('/:userId/followers', auth, async (req, res) => {
  try {
    const followers = await Follow.find({ following: req.params.userId })
      .populate('follower', 'username profilePicture bio')
      .sort({ createdAt: -1 });

    res.json(followers.map(follow => follow.follower));
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Error fetching followers' });
  }
});

// Get user's following
router.get('/:userId/following', auth, async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.params.userId })
      .populate('following', 'username profilePicture bio')
      .sort({ createdAt: -1 });

    res.json(following.map(follow => follow.following));
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Error fetching following' });
  }
});

// Test route for S3 upload with better error handling
router.post('/profile-picture', auth, upload.handleUpload('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Update user's profile picture URL
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePicture: req.file.location }, // S3 file location
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Error uploading profile picture' });
  }
});

export default router;
