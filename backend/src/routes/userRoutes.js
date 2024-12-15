import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';
import Follow from '../models/Follow.js';
import Post from '../models/Post.js';
import * as userController from '../controllers/userController.js';
import { getSuggestedUsers } from '../controllers/userController.js';




const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
router.get('/suggestions', auth, getSuggestedUsers);




const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  };

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });

  
  
  router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Just save the filename
      user.profilePicture = req.file.filename;
      await user.save();
  
      // Return the full URL in the response
      res.json({ 
        message: 'Profile picture updated successfully',
        profilePicture: req.file.filename
      });
  
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  });

  
  router.get('/:username', auth, async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username })
        .select('-password');
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Get user's posts and other data
      const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });
      const followers = await Follow.countDocuments({ following: user._id });
      const following = await Follow.countDocuments({ follower: user._id });
      const isFollowing = await Follow.findOne({
        follower: req.user.userId,
        following: user._id
      });
  
      const userData = user.toObject();
  
      res.json({
        ...userData,
        posts,
        followers,
        following,
        isFollowing: !!isFollowing
      });
  
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Error fetching profile' });
    }
  });
  
  // Follow user
  router.post('/:userId/follow', auth, async (req, res) => {
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
      res.json({ message: 'Successfully followed user' });
  
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({ error: 'Error following user' });
    }
  });
  
  // Unfollow user
  router.delete('/:userId/follow', auth, async (req, res) => {
    try {
      const result = await Follow.deleteOne({
        follower: req.user.userId,
        following: req.params.userId
      });
  
      if (result.deletedCount === 0) {
        return res.status(400).json({ error: 'Not following this user' });
      }
  
      res.json({ message: 'Successfully unfollowed user' });
  
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: 'Error unfollowing user' });
    }
  });
  
  // Save/unsave post
  router.put('/saved-posts/:postId', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      const postId = req.params.postId;
  
      const isSaved = user.savedPosts?.includes(postId);
      
      if (isSaved) {
        // Remove from saved posts
        user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
      } else {
        // Add to saved posts
        if (!user.savedPosts) user.savedPosts = [];
        user.savedPosts.push(postId);
      }
  
      await user.save();
      res.json({ message: isSaved ? 'Post unsaved' : 'Post saved' });
  
    } catch (error) {
      console.error('Error toggling saved post:', error);
      res.status(500).json({ error: 'Error toggling saved post' });
    }
  });


export default router;