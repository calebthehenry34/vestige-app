import Post from '../models/Post.js';
import User from '../models/User.js';
import s3, { isS3Available } from '../config/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Helper function to store file locally when S3 is not available
const storeFileLocally = async (buffer, filename) => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
};

// Helper function to process image with sharp
const processImage = async (buffer, adjustments = {}) => {
  try {
    let sharpImage = sharp(buffer);

    // Apply adjustments if they exist
    if (adjustments) {
      const { brightness = 100, contrast = 100, saturation = 100 } = adjustments;
      
      sharpImage = sharpImage
        .modulate({
          brightness: brightness / 100,
          saturation: saturation / 100
        })
        .gamma(contrast / 100);
    }

    // Always convert to JPEG and optimize
    const processedBuffer = await sharpImage
      .jpeg({
        quality: 85,
        mozjpeg: true,
      })
      .withMetadata()
      .toBuffer();

    // Create thumbnail
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({
        quality: 70,
        mozjpeg: true,
      })
      .toBuffer();

    return {
      processedBuffer,
      thumbnailBuffer
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
};

export const createPost = async (req, res) => {
  try {
    const { 
      caption,
      location,
      hashtags: hashtagsString,
      taggedUsers: taggedUsersString,
      adjustments: adjustmentsString
    } = req.body;

    let mediaUrl = null;
    let thumbnailUrl = null;
    let key = null;
    let thumbnailKey = null;

    // Parse JSON strings
    const hashtags = JSON.parse(hashtagsString || '[]');
    const taggedUsers = JSON.parse(taggedUsersString || '[]');
    const adjustments = JSON.parse(adjustmentsString || '{}');

    // Validate tagged users exist
    if (taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
    }

    // Handle file upload if present
    if (req.file) {
      try {
        // Process image with adjustments
        const { processedBuffer, thumbnailBuffer } = await processImage(req.file.buffer, adjustments);

        // Generate unique filenames
        const filename = `${crypto.randomUUID()}.jpg`;
        const thumbnailFilename = `thumbnail-${filename}`;

        if (isS3Available()) {
          // Upload both full size and thumbnail to S3
          key = `posts/${filename}`;
          thumbnailKey = `posts/thumbnails/${thumbnailFilename}`;

          await Promise.all([
            s3.send(new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key,
              Body: processedBuffer,
              ContentType: 'image/jpeg'
            })),
            s3.send(new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: thumbnailKey,
              Body: thumbnailBuffer,
              ContentType: 'image/jpeg'
            }))
          ]);

          mediaUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
          thumbnailUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;
        } else {
          // Fall back to local storage
          mediaUrl = await storeFileLocally(processedBuffer, filename);
          thumbnailUrl = await storeFileLocally(thumbnailBuffer, thumbnailFilename);
          key = filename;
          thumbnailKey = thumbnailFilename;
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Error uploading file' });
      }
    }

    const post = new Post({
      user: req.user.userId,
      caption,
      location,
      hashtags,
      taggedUsers,
      media: mediaUrl,
      thumbnail: thumbnailUrl,
      mediaKey: key,
      thumbnailKey: thumbnailKey,
      imageAdjustments: adjustments
    });

    await post.save();
    
    // Populate user details and tagged users
    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' }
    ]);
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete media if exists
    if (post.media && post.mediaKey) {
      try {
        if (isS3Available()) {
          // Delete both full size and thumbnail from S3
          await Promise.all([
            s3.send(new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: post.mediaKey
            })),
            post.thumbnailKey && s3.send(new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: post.thumbnailKey
            }))
          ]);
        } else {
          // Delete local files
          const filePath = path.join(process.cwd(), 'uploads', post.mediaKey);
          const thumbnailPath = post.thumbnailKey && path.join(process.cwd(), 'uploads', post.thumbnailKey);
          
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
          if (thumbnailPath && fs.existsSync(thumbnailPath)) {
            await fs.promises.unlink(thumbnailPath);
          }
        }
      } catch (deleteError) {
        console.error('Error deleting media:', deleteError);
        // Continue with post deletion even if media deletion fails
      }
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture')
      .populate('taggedUsers', 'username profilePicture');

    const total = await Post.countDocuments();
    
    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture')
      .populate('taggedUsers', 'username profilePicture');

    const total = await Post.countDocuments({ user: userId });
    
    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Error fetching user posts' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { caption, location, hashtags, taggedUsers } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate tagged users if they're being updated
    if (taggedUsers && taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
    }

    // Update fields if provided
    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (hashtags !== undefined) post.hashtags = hashtags;
    if (taggedUsers !== undefined) post.taggedUsers = taggedUsers;

    await post.save();

    // Populate user details and tagged users
    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' }
    ]);

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const liked = post.likes.includes(req.user.userId);
    
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.userId);
    } else {
      post.likes.push(req.user.userId);
    }

    await post.save();
    
    // Populate user details and tagged users
    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' }
    ]);

    res.json(post);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Error liking post' });
  }
};

export const getPostsByHashtag = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ hashtags: hashtag })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture')
      .populate('taggedUsers', 'username profilePicture');

    const total = await Post.countDocuments({ hashtags: hashtag });
    
    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
};
