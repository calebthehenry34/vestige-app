import Post from '../../models/Post.js';
import User from '../../models/User.js';
import Notification from '../../models/notification.js';
import { isS3Available } from '../../config/s3.js';
import imageProcessingService from '../../services/imageProcessingService.js';
import s3UploadService from '../../utils/s3Upload.js';
import crypto from 'crypto';

/**
 * Create a new post with optimized image processing
 */
export const createOptimizedPost = async ({
  file,
  userId,
  caption,
  location,
  hashtagsString,
  taggedUsersString
}) => {
  // Parse hashtags and tagged users
  let hashtags = [];
  let taggedUsers = [];

  try {
    hashtags = hashtagsString ? JSON.parse(hashtagsString) : [];
    taggedUsers = taggedUsersString ? JSON.parse(taggedUsersString) : [];
  } catch (parseError) {
    throw new Error('Invalid JSON data in request');
  }

  // Validate tagged users
  if (taggedUsers.length > 0) {
    const users = await User.find({ _id: { $in: taggedUsers } });
    if (users.length !== taggedUsers.length) {
      throw new Error('One or more tagged users do not exist');
    }
  }

  // Process and upload image
  let mediaData;
  try {
    // Process image and generate variants
    const processedImage = await imageProcessingService.processImage(file.buffer);
    
    // Generate blur placeholder
    const placeholder = await imageProcessingService.generateBlurPlaceholder(file.buffer);

    if (isS3Available()) {
      // Upload all variants to S3
      const uploaded = await s3UploadService.uploadAllVariants(
        processedImage,
        file.originalname
      );

      mediaData = {
        type: 'image',
        variants: uploaded.variants,
        metadata: uploaded.metadata,
        placeholder
      };
    } else {
      // Fallback to local storage for development
      const filename = `${crypto.randomUUID()}.jpg`;
      const url = await storeFileLocally(file.buffer, filename);
      
      mediaData = {
        type: 'image',
        legacy: {
          url,
          key: filename
        }
      };
    }
  } catch (processingError) {
    console.error('Image processing error:', processingError);
    throw new Error('Failed to process image');
  }

  // Create post
  const post = new Post({
    user: userId,
    caption,
    location,
    hashtags,
    taggedUsers,
    media: mediaData
  });

  await post.save();
  
  // Populate user data
  await post.populate([
    { path: 'user', select: 'username profilePicture' },
    { path: 'taggedUsers', select: 'username profilePicture' }
  ]);

  // Create notifications for tagged users
  const notificationPromises = taggedUsers.map(taggedUserId => {
    if (taggedUserId.toString() !== userId) {
      return Notification.create({
        recipient: taggedUserId,
        sender: userId,
        type: 'tag',
        post: post._id
      });
    }
  }).filter(Boolean);

  await Promise.all(notificationPromises);

  return post;
};

// Helper function for local storage fallback
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
