import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Notification from '../models/notification.js';
import { generatePresignedUrl } from '../config/s3.js';

const router = express.Router();

// Helper function to process user data with pre-signed URLs
const processUserWithPresignedUrl = async (user) => {
  if (!user) return null;
  const userData = user.toObject ? user.toObject() : { ...user };
  
  if (userData.profilePicture && userData.profilePicture.startsWith('profile-pictures/')) {
    const presignedUrl = await generatePresignedUrl(userData.profilePicture);
    if (presignedUrl) {
      userData.profilePicture = presignedUrl;
    }
  }
  
  return userData;
};

// Get all users
router.get('/suggestions', auth, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user.userId } },
      'username profilePicture bio'
    ).limit(20);
    
    // Process each user to include pre-signed URLs
    const processedUsers = await Promise.all(
      users.map(user => processUserWithPresignedUrl(user))
    );
    
    res.json(processedUsers);
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

    // Filter out any null follower references and map to user objects
    const validFollowers = followers
      .filter(follow => follow.follower !== null)
      .map(follow => ({
        ...follow.follower.toObject(),
        _id: follow.follower._id,
        isFollowing: false // Default value, will be updated in the next step
      }));

    // Get the current user's following list to determine who they follow
    const currentUserFollowing = await Follow.find({ follower: req.user.userId })
      .select('following');
    
    const followingIds = currentUserFollowing.map(f => f.following.toString());

    // Update isFollowing status and process pre-signed URLs for each follower
    const followersWithStatus = await Promise.all(
      validFollowers.map(async follower => ({
        ...(await processUserWithPresignedUrl(follower)),
        isFollowing: followingIds.includes(follower._id.toString())
      }))
    );

    res.json(followersWithStatus);
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

    // Filter out any null following references and map to user objects
    const validFollowing = following
      .filter(follow => follow.following !== null)
      .map(follow => ({
        ...follow.following.toObject(),
        _id: follow.following._id,
        isFollowing: true // These are users that are being followed by the requested user
      }));

    // Process pre-signed URLs for each following user
    const processedFollowing = await Promise.all(
      validFollowing.map(user => processUserWithPresignedUrl(user))
    );

    res.json(processedFollowing);
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
      { profilePicture: req.file.key }, // Store S3 key instead of location
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate pre-signed URL for the response
    const processedUser = await processUserWithPresignedUrl(user);

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: processedUser.profilePicture
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Error uploading profile picture' });
  }
});

export default router;
