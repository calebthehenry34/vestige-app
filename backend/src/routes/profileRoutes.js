import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import upload from '../middleware/upload.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3, { getS3BucketName, isS3Available } from '../config/s3.js';
import crypto from 'crypto';

const router = express.Router();

const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop();
  return `${timestamp}-${hash}.${ext}`;
};

router.post('/complete-onboarding', 
  auth, 
  upload.handleUpload('profilePicture'), 
  async (req, res) => {
    try {
      console.log('Starting onboarding completion...');
      console.log('User ID:', req.user.userId);
      console.log('File received:', req.file); 
      console.log('Body:', req.body);

      const userId = req.user.userId;
      const { bio } = req.body;
      
      let profilePictureUrl;
      
      if (req.file) {
        try {
          // Check if S3 is available
          if (!isS3Available()) {
            console.error('S3 client is not available');
            return res.status(500).json({ message: 'S3 storage is not configured' });
          }

          const fileName = generateUniqueFileName(req.file.originalname);
          const bucketName = getS3BucketName();
          
          console.log('Preparing S3 upload...', {
            bucketName,
            fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
          });

          // Ensure the file buffer is base64 encoded
          const base64Data = req.file.buffer.toString('base64');
          const buffer = Buffer.from(base64Data, 'base64');

          const uploadParams = {
            Bucket: bucketName,
            Key: `profile-pictures/${fileName}`,
            Body: buffer,
            ContentType: req.file.mimetype,
            ContentEncoding: 'base64',
            CacheControl: 'max-age=31536000'
            // Removed ACL parameter as the bucket doesn't allow it
          };

          console.log('Attempting S3 upload with params:', {
            Bucket: uploadParams.Bucket,
            Key: uploadParams.Key,
            ContentType: uploadParams.ContentType,
            ContentEncoding: uploadParams.ContentEncoding,
            BufferLength: buffer.length
          });

          const command = new PutObjectCommand(uploadParams);
          
          console.log('Sending S3 command...');
          await s3.send(command);

          // Use virtual-hosted-style URL
          profilePictureUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/profile-pictures/${fileName}`;
          console.log('S3 upload successful:', profilePictureUrl);
        } catch (uploadError) {
          console.error('S3 upload error:', {
            message: uploadError.message,
            code: uploadError.code,
            stack: uploadError.stack,
            requestId: uploadError.$metadata?.requestId,
            region: process.env.AWS_REGION,
            bucket: getS3BucketName()
          });
          return res.status(500).json({ 
            message: 'Failed to upload profile picture',
            details: uploadError.message
          });
        }
      }

      console.log('Updating user profile...');
      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          bio,
          profilePicture: profilePictureUrl,
          onboardingComplete: true
        },
        { new: true }
      );

      if (!updatedUser) {
        console.error('User not found:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('User profile updated successfully:', {
        userId: updatedUser._id,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        onboardingComplete: updatedUser.onboardingComplete
      });

      res.json({
        message: 'Onboarding completed successfully',
        user: {
          ...updatedUser.toObject(),
          profilePicture: profilePictureUrl
        }
      });
    } catch (error) {
      console.error('Complete onboarding error:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.userId
      });
      res.status(500).json({ 
        message: 'Failed to complete onboarding',
        details: error.message
      });
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
    .select('username email bio profilePicture onboardingComplete')
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
    console.log('User from token:', req.user);
    console.log('Request body:', req.body);

    const { bio, location, website } = req.body;
    
    const user = await User.findById(req.user.userId);
    console.log('Found user:', user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (website) user.website = website;
    
    await user.save();
    console.log('Updated user:', user);

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
