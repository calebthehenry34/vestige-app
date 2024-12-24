import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/notification.js';
import imageProcessingService from '../services/imageProcessingService.js';
import s3UploadService from '../utils/s3Upload.js';
import { isS3Available } from '../config/s3.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Helper function to store file locally when S3 is not available
const storeFileLocally = async (buffer, filename) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error storing file locally:', error);
    throw new Error('Failed to store file locally');
  }
};

export const createMultiImagePost = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { 
      caption,
      location,
      hashtags: hashtagsString,
      taggedUsers: taggedUsersString
    } = req.body;

    let hashtags = [];
    let taggedUsers = [];

    try {
      hashtags = hashtagsString ? JSON.parse(hashtagsString) : [];
      taggedUsers = taggedUsersString ? JSON.parse(taggedUsersString) : [];
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }

    if (taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
    }

    // Process each image and prepare media data
    const processedMediaItems = await Promise.all(req.files.map(async (file) => {
      const processedImages = await imageProcessingService.processImage(file.buffer);
      const blurPlaceholder = await imageProcessingService.generateBlurPlaceholder(file.buffer);

      let mediaData;
      if (isS3Available()) {
        try {
          mediaData = await s3UploadService.uploadAllVariants(
            processedImages,
            file.originalname,
            file.buffer,
            file.mimetype
          );
        } catch (s3Error) {
          throw new Error(`Failed to upload to S3: ${s3Error.message}`);
        }
      } else {
        const filename = `${crypto.randomUUID()}.jpg`;
        // Store original and variants locally
        const mediaUrl = await storeFileLocally(file.buffer, filename);
        const variants = {};
        
        // Create variants matching the processed sizes
        Object.entries(processedImages.processed).forEach(([size, data]) => {
          variants[size] = {
            urls: {
              jpeg: mediaUrl, // Use same URL for both formats when storing locally
              webp: mediaUrl
            },
            dimensions: data.dimensions
          };
        });

        mediaData = {
          type: 'image',
          variants
        };
      }

      return {
        type: 'image',
        variants: mediaData.variants,
        metadata: processedImages.metadata,
        placeholder: blurPlaceholder
      };
    }));

    const post = new Post({
      user: req.user.userId,
      caption,
      location,
      hashtags,
      taggedUsers,
      mediaItems: processedMediaItems
    });

    await post.save();
    
    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' }
    ]);

    // Create notifications for tagged users
    for (const taggedUserId of taggedUsers) {
      if (taggedUserId.toString() !== req.user.userId) {
        await Notification.create({
          recipient: taggedUserId,
          sender: req.user.userId,
          type: 'tag',
          post: post._id
        });
      }
    }

    res.status(201).json(post);
  } catch (error) {
    console.error('Create multi-image post error:', error);
    res.status(500).json({ error: 'Error creating post with multiple images' });
  }
};

export default createMultiImagePost;
