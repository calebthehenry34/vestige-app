import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import upload from '../middleware/upload.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3, { getS3BucketName, isS3Available } from '../config/s3.js';
import crypto from 'crypto';

const router = express.Router();

const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop();
  return `${timestamp}-${hash}.${ext}`;
};

const generatePresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: key
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
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
      
      let profilePictureKey;
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
          profilePictureKey = `profile-pictures/${fileName}`;
          
          console.log('Preparing S3 upload...', {
            bucketName,
            fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
          });

          const uploadParams = {
            Bucket: bucketName,
            Key: profilePictureKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            CacheControl: 'max-age=31536000'
          };

          console.log('Attempting S3 upload with params:', {
            Bucket: uploadParams.Bucket,
            Key: uploadParams.Key,
            ContentType: uploadParams.ContentType,
            BufferLength: req.file.buffer.length
          });

          const command = new PutObjectCommand(uploadParams);
          
          console.log('Sending S3 command...');
          await s3.send(command);

          // Generate a pre-signed URL for the uploaded file
          profilePictureUrl = await generatePresignedUrl(profilePictureKey);
          console.log('S3 upload successful, generated pre-signed URL:', profilePictureUrl);
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
      // Store the S3 key in the database, not the pre-signed URL
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          bio,
          profilePicture: profilePictureKey, // Store the S3 key
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
        profilePictureKey: updatedUser.profilePicture,
        onboardingComplete: updatedUser.onboardingComplete
      });

      res.json({
        message: 'Onboarding completed successfully',
        user: {
          ...updatedUser.toObject(),
          profilePicture: profilePictureUrl // Send the pre-signed URL to the client
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

    // Generate pre-signed URL for profile picture if it exists
    if (profile.profilePicture) {
      profile.profilePicture = await generatePresignedUrl(profile.profilePicture);
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

    // Generate pre-signed URL for profile picture if it exists
    let profilePictureUrl = user.profilePicture;
    if (profilePictureUrl) {
      profilePictureUrl = await generatePresignedUrl(profilePictureUrl);
    }

    console.log('Updated user:', user);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        profilePicture: profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

export default router;
