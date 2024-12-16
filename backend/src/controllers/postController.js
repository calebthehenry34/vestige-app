import Post from '../models/Post.js';
import User from '../models/User.js';
import s3, { isS3Available } from '../config/s3.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Helper function to store file locally when S3 is not available
const storeFileLocally = async (file) => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileExtension = path.extname(file.originalname);
  const key = `${crypto.randomUUID()}${fileExtension}`;
  const filePath = path.join(uploadsDir, key);
  
  await fs.promises.writeFile(filePath, file.buffer);
  return {
    key,
    url: `/uploads/${key}` // This will be served by your static file middleware
  };
};

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    let mediaUrl = null;
    let key = null;

    // Handle file upload if present
    if (req.file) {
      try {
        if (isS3Available()) {
          // Upload to S3 if available
          key = `${crypto.randomUUID()}${path.extname(req.file.originalname)}`;
          await s3.upload({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          }).promise();
          
          mediaUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        } else {
          // Fall back to local storage
          const result = await storeFileLocally(req.file);
          key = result.key;
          mediaUrl = result.url;
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Error uploading file' });
      }
    }

    const post = new Post({
      user: req.user.userId,
      content,
      media: mediaUrl,
      mediaKey: key
    });

    await post.save();
    
    // Populate user details
    await post.populate('user', 'username profilePicture');
    
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
          // Delete from S3 if available
          await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: post.mediaKey
          }).promise();
        } else {
          // Delete local file
          const filePath = path.join(process.cwd(), 'uploads', post.mediaKey);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
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
      .populate('user', 'username profilePicture');

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
      .populate('user', 'username profilePicture');

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
    const { content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    post.content = content;
    await post.save();

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
    res.json(post);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Error liking post' });
  }
};
