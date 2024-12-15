import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import upload from '../middleware/upload.js';



const router = express.Router();

router.post('/complete-onboarding', 
  auth, 
  upload.single('profilePicture'), 
  async (req, res) => {
    try {
      console.log('File received:', req.file); // Check what file data you're getting
      const userId = req.user.userId;
      const { username, bio } = req.body;
      
      console.log('File received:', req.file); // Debug log
      
      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          username,
          bio,
          profilePicture: req.file ? req.file.filename : undefined,
          onboardingComplete: true
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('Updated user:', updatedUser); // Debug log

      res.json({
        message: 'Onboarding completed successfully',
        user: {
          ...updatedUser.toObject(),
          profilePicture: req.file ? req.file.filename : null
        }
      });
    } catch (error) {
      console.error('Complete onboarding error:', error);
      res.status(500).json({ message: 'Failed to complete onboarding' });
    }
  }
);


router.get('/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    console.log('Attempting to fetch profile for username:', username);
    
    const profile = await User.findOne({ 
      username: new RegExp(`^${username}$`, 'i') 
    })
    .select('username email bio profilePicture onboardingComplete')  // Only select needed fields
    .lean();

    if (!profile) {
      console.log('No profile found for username:', username);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Profile found:', profile);
    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message
    });
  }
});


router.post('/update', auth, async (req, res) => {
  try {
    console.log('User from token:', req.user); // Debug log
    console.log('Request body:', req.body); // Debug log

    const { bio, location, website } = req.body;
    
    const user = await User.findById(req.user.userId);
    console.log('Found user:', user); // Debug log

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (website) user.website = website;
    
    await user.save();
    console.log('Updated user:', user); // Debug log

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

export default router;