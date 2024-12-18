import Post from '../models/Post.js';
import User from '../models/User.js';
import s3, { isS3Available, getCredentialsProvider } from '../config/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
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

export const createPost = async (req, res) => {
  console.log('Starting createPost');
  try {
    // Log the request file and body
    console.log('Request file:', req.file ? {
      ...req.file,
      buffer: req.file.buffer ? 'Buffer present' : 'Buffer missing'
    } : 'No file');
    console.log('Request body:', {
      ...req.body,
      hashtags: req.body.hashtags ? 'present' : 'missing',
      taggedUsers: req.body.taggedUsers ? 'present' : 'missing'
    });

    if (!req.file || !req.file.buffer) {
      console.error('No file uploaded or file buffer missing');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      caption,
      location,
      hashtags: hashtagsString,
      taggedUsers: taggedUsersString
    } = req.body;

    let mediaUrl = null;
    let key = null;

    // Parse JSON strings with error handling
    let hashtags = [];
    let taggedUsers = [];

    try {
      hashtags = hashtagsString ? JSON.parse(hashtagsString) : [];
      taggedUsers = taggedUsersString ? JSON.parse(taggedUsersString) : [];
    } catch (parseError) {
      console.error('Error parsing JSON strings:', parseError);
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }

    // Validate tagged users exist
    if (taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
    }

    try {
      // Generate unique filename
      const filename = `${crypto.randomUUID()}.jpg`;

      if (isS3Available()) {
        console.log('Uploading to S3...');
        try {
          // Get fresh credentials
          const credentialsProvider = getCredentialsProvider();
          const credentials = await credentialsProvider();
          
          // Log credential state before upload
          console.log('S3 Upload Credentials Check:', {
            hasAccessKey: !!credentials.accessKeyId,
            accessKeyLength: credentials.accessKeyId?.length,
            hasSecretKey: !!credentials.secretAccessKey,
            secretKeyLength: credentials.secretAccessKey?.length,
            region: process.env.AWS_REGION
          });

          // Upload to S3
          key = `posts/${filename}`;

          const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: 'image/jpeg'
          });

          const result = await s3.send(command);
          console.log('S3 upload response:', {
            requestId: result.$metadata?.requestId,
            attempts: result.$metadata?.attempts,
            totalTime: result.$metadata?.totalTime
          });

          mediaUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
          console.log('S3 upload successful');
        } catch (s3Error) {
          console.error('Detailed S3 upload error:', {
            name: s3Error.name,
            message: s3Error.message,
            code: s3Error.code,
            requestId: s3Error.$metadata?.requestId,
            stack: s3Error.stack
          });
          throw new Error(`Failed to upload to S3: ${s3Error.message}`);
        }
      } else {
        console.log('Storing file locally...');
        // Fall back to local storage
        mediaUrl = await storeFileLocally(req.file.buffer, filename);
        key = filename;
        console.log('Local storage successful');
      }

      console.log('Creating post document...');
      const post = new Post({
        user: req.user.userId,
        caption,
        location,
        hashtags,
        taggedUsers,
        media: mediaUrl,
        mediaKey: key
      });

      await post.save();
      console.log('Post saved successfully');
      
      // Populate user details and tagged users
      await post.populate([
        { path: 'user', select: 'username profilePicture' },
        { path: 'taggedUsers', select: 'username profilePicture' }
      ]);
      
      res.status(201).json(post);
    } catch (processError) {
      console.error('Error in file upload or storage:', processError);
      return res.status(500).json({ error: processError.message });
    }
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
          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: post.mediaKey
          }));
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
