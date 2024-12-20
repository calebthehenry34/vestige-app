import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import User from '../models/User.js';

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
