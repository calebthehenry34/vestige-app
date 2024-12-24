// Model imports
import Post from '../models/Post.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Notification from '../models/notification.js';

// AWS imports
import s3, { isS3Available, getCredentials, getS3BucketName } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Node.js built-in imports
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

// Service imports
import imageProcessingService from '../services/imageProcessingService.js';
import s3UploadService from '../utils/s3Upload.js';

// Helper function to validate and format URLs
const getValidUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.API_URL}/uploads/${url}`;
};

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

// Helper function to process posts with image variants
export const processPostsWithPresignedUrls = async (posts) => {
  const isArray = Array.isArray(posts);
  const postsArray = isArray ? posts : [posts];

  console.log('Processing posts:', postsArray);

  const processedPosts = await Promise.all(postsArray.map(async (post) => {
    const postObj = post.toObject ? post.toObject() : post;
    console.log('Processing post:', postObj._id);
    
    // Handle legacy posts (old format)
    if (postObj.mediaKey && !postObj.media?.variants) {
      console.log('Processing legacy post with mediaKey:', postObj.mediaKey);
      try {
        const command = new GetObjectCommand({
          Bucket: getS3BucketName(),
          Key: postObj.mediaKey
        });
        
        if (isS3Available()) {
          postObj.media = {
            type: 'image',
            legacy: {
              url: await getSignedUrl(s3, command, { expiresIn: 3600 }),
              key: postObj.mediaKey
            }
          };
        } else {
          postObj.media = {
            type: 'image',
            legacy: {
              url: postObj.media,
              key: postObj.mediaKey
            }
          };
        }
      } catch (error) {
        console.error('Error processing legacy post:', error);
        postObj.media = {
          type: 'image',
          legacy: {
            url: postObj.media,
            key: postObj.mediaKey
          }
        };
      }
    }
    // Handle new format posts (with variants)
    else if ((postObj.media?.variants || postObj.mediaItems) && isS3Available()) {
      console.log('Processing post with variants:', postObj.media?.variants || postObj.mediaItems);
      try {
        // Handle single media
        if (postObj.media?.variants) {
          postObj.media = {
            type: postObj.media.type || 'image',
            variants: postObj.media.variants,
            metadata: postObj.media.metadata,
            placeholder: postObj.media.placeholder
          };
        }
        
        // Handle multiple media items
        if (postObj.mediaItems) {
          postObj.mediaItems = postObj.mediaItems.map(item => ({
            type: item.type || 'image',
            variants: item.variants,
            metadata: item.metadata,
            placeholder: item.placeholder
          }));
        }
      } catch (error) {
        console.error('Error processing post with variants:', error);
      }
    }
    
    return postObj;
  }));

  // Always return the processed posts in their original form (array or single object)
  return isArray ? processedPosts : processedPosts[0];
};

// Generate a pre-signed URL for an S3 object
const generatePresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: key
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          commentsCount: { $size: { $ifNull: ["$comments", []] } }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    await Post.populate(posts, [
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPosts = await processPostsWithPresignedUrls(posts);

    const total = await Post.countDocuments();
    
    res.json({
      posts: processedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
};

export const getExplorePosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          commentsCount: { $size: { $ifNull: ["$comments", []] } }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    await Post.populate(posts, [
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' }
    ]);

    const processedPosts = await processPostsWithPresignedUrls(posts);

    const total = await Post.countDocuments();

    res.json({
      posts: processedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get explore posts error:', error);
    res.status(500).json({ error: 'Error fetching explore posts' });
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
      .populate('taggedUsers', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      });

    const processedPosts = await processPostsWithPresignedUrls(posts);

    const total = await Post.countDocuments({ user: userId });
    
    res.json({
      posts: processedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Error fetching user posts' });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const { postId } = req.params;
    console.log('Received request for post ID:', postId);
    console.log('Request headers:', req.headers);
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.log('Invalid post ID format:', postId);
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    
    console.log('Looking up post with ID:', postId);
    const post = await Post.findById(postId)
      .populate('user', 'username profilePicture')
      .populate('taggedUsers', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      });

    if (!post) {
      console.log('No post found with ID:', postId);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Found post:', post._id);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({ error: 'Error fetching post' });
  }
};

// Import the createMultiImagePost function
export { createMultiImagePost } from './createMultiImagePost.js';

export const createPost = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
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

    // Process image into multiple sizes and formats
    const processedImages = await imageProcessingService.processImage(req.file.buffer);
    const blurPlaceholder = await imageProcessingService.generateBlurPlaceholder(req.file.buffer);

    let mediaData;
    if (isS3Available()) {
      try {
        // Upload all image variants to S3
        mediaData = await s3UploadService.uploadAllVariants(
          processedImages,
          req.file.originalname,
          req.file.buffer,
          req.file.mimetype
        );
      } catch (s3Error) {
        throw new Error(`Failed to upload to S3: ${s3Error.message}`);
      }
    } else {
      // Fallback to local storage
      const filename = `${crypto.randomUUID()}.jpg`;
      // Store original and variants locally
      mediaUrl = await storeFileLocally(req.file.buffer, filename);
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

    const post = new Post({
      user: req.user.userId,
      caption,
      location,
      hashtags,
      taggedUsers,
      media: {
        type: 'image',
        variants: mediaData.variants,
        metadata: processedImages.metadata,
        placeholder: blurPlaceholder
      }
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
    
    const processedPost = await processPostsWithPresignedUrls(post);
    res.status(201).json(processedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { caption, location, hashtags, taggedUsers } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID format' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (taggedUsers && taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
    }

    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (hashtags !== undefined) post.hashtags = hashtags;
    if (taggedUsers !== undefined) post.taggedUsers = taggedUsers;

    await post.save();

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete media files
    try {
      if (isS3Available()) {
        // Delete legacy media
        if (post.mediaKey) {
          await s3.send(new DeleteObjectCommand({
            Bucket: getS3BucketName(),
            Key: post.mediaKey
          }));
        }

        // Delete media variants
        if (post.media?.variants) {
          for (const variant of Object.values(post.media.variants)) {
            if (variant.urls?.webp) {
              await s3.send(new DeleteObjectCommand({
                Bucket: getS3BucketName(),
                Key: variant.urls.webp
              }));
            }
            if (variant.urls?.jpeg) {
              await s3.send(new DeleteObjectCommand({
                Bucket: getS3BucketName(),
                Key: variant.urls.jpeg
              }));
            }
          }
        }

        // Delete multiple media items
        if (post.mediaItems) {
          for (const mediaItem of post.mediaItems) {
            for (const variant of Object.values(mediaItem.variants)) {
              if (variant.urls?.webp) {
                await s3.send(new DeleteObjectCommand({
                  Bucket: getS3BucketName(),
                  Key: variant.urls.webp
                }));
              }
              if (variant.urls?.jpeg) {
                await s3.send(new DeleteObjectCommand({
                  Bucket: getS3BucketName(),
                  Key: variant.urls.jpeg
                }));
              }
            }
          }
        }
      } else {
        // Delete local files
        if (post.mediaKey) {
          const filePath = path.join(process.cwd(), 'uploads', post.mediaKey);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
        if (post.media?.variants) {
          for (const variant of Object.values(post.media.variants)) {
            if (variant.urls?.webp) {
              const filePath = path.join(process.cwd(), 'uploads', variant.urls.webp);
              if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
              }
            }
            if (variant.urls?.jpeg) {
              const filePath = path.join(process.cwd(), 'uploads', variant.urls.jpeg);
              if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
              }
            }
          }
        }
        if (post.mediaItems) {
          for (const mediaItem of post.mediaItems) {
            for (const variant of Object.values(mediaItem.variants)) {
              if (variant.urls?.webp) {
                const filePath = path.join(process.cwd(), 'uploads', variant.urls.webp);
                if (fs.existsSync(filePath)) {
                  await fs.promises.unlink(filePath);
                }
              }
              if (variant.urls?.jpeg) {
                const filePath = path.join(process.cwd(), 'uploads', variant.urls.jpeg);
                if (fs.existsSync(filePath)) {
                  await fs.promises.unlink(filePath);
                }
              }
            }
          }
        }
      }
    } catch (deleteError) {
      console.error('Error deleting media:', deleteError);
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
};

export const likePost = async (req, res) => {
  try {
    // Use findOne to get the current state and check if post exists
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const liked = post.likes.includes(req.user.userId);
    
    // Use atomic operations to update the likes array
    const updatedPost = await Post.findOneAndUpdate(
      { _id: req.params.postId },
      liked
        ? { $pull: { likes: req.user.userId } }
        : { $addToSet: { likes: req.user.userId } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found after update' });
    }

    // Handle notifications atomically
    if (liked) {
      await Notification.deleteOne({
        recipient: post.user,
        sender: req.user.userId,
        type: 'like',
        post: post._id
      });
    } else if (post.user.toString() !== req.user.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.userId,
        type: 'like',
        post: post._id
      });
    }
    
    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
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
      .populate('taggedUsers', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      });

    const processedPosts = await processPostsWithPresignedUrls(posts);

    const total = await Post.countDocuments({ hashtags: hashtag });
    
    res.json({
      posts: processedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
};

export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex) || [];
    const mentionedUsernames = mentions.map(mention => mention.substring(1));
    const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

    const comment = {
      text,
      user: req.user.userId,
      likes: [],
      replies: []
    };

    post.comments.push(comment);
    await post.save();

    if (post.user.toString() !== req.user.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.userId,
        type: 'comment',
        post: post._id,
        comment: post.comments[post.comments.length - 1]._id
      });
    }

    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser._id.toString() !== req.user.userId) {
        await Notification.create({
          recipient: mentionedUser._id,
          sender: req.user.userId,
          type: 'tag',
          post: post._id,
          comment: post.comments[post.comments.length - 1]._id
        });
      }
    }

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
};

export const addReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex) || [];
    const mentionedUsernames = mentions.map(mention => mention.substring(1));
    const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

    const reply = {
      text,
      user: req.user.userId
    };

    comment.replies.push(reply);
    await post.save();

    if (comment.user.toString() !== req.user.userId) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user.userId,
        type: 'reply',
        post: post._id,
        comment: comment._id
      });
    }

    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser._id.toString() !== req.user.userId) {
        await Notification.create({
          recipient: mentionedUser._id,
          sender: req.user.userId,
          type: 'tag',
          post: post._id,
          comment: comment._id
        });
      }
    }

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ error: 'Error adding reply' });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    // Use findOne to get current state and check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const liked = comment.likes.includes(userId);

    // Use atomic operations to update the comment likes
    const updatedPost = await Post.findOneAndUpdate(
      { 
        _id: postId,
        'comments._id': commentId
      },
      liked
        ? { $pull: { 'comments.$.likes': userId } }
        : { $addToSet: { 'comments.$.likes': userId } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found after update' });
    }

    // Handle notifications atomically
    if (liked) {
      await Notification.deleteOne({
        recipient: comment.user,
        sender: userId,
        type: 'commentLike',
        post: postId,
        comment: commentId
      });
    } else if (comment.user.toString() !== userId) {
      await Notification.create({
        recipient: comment.user,
        sender: userId,
        type: 'commentLike',
        post: postId,
        comment: commentId
      });
    }

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Error liking comment' });
  }
};

export const getPostMedia = async (req, res) => {
  try {
    const { postId } = req.params;
    const { index = 0 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Handle multiple media items
    if (post.mediaItems && post.mediaItems[index]) {
      const mediaItem = post.mediaItems[index];
      
      // Log media item structure for debugging
      console.log('Media item structure:', JSON.stringify(mediaItem, null, 2));

      if (mediaItem.variants?.large) {
        // If CDN URL is available, redirect to it
        if (mediaItem.variants.large.cdnUrl) {
          return res.redirect(mediaItem.variants.large.cdnUrl);
        }
        // Use WebP or JPEG URL
        const url = mediaItem.variants.large.urls?.webp || mediaItem.variants.large.urls?.jpeg;
        if (url) {
          if (url.startsWith('http')) {
            return res.redirect(url);
          }
          return res.redirect(`${process.env.API_URL}/uploads/${url}`);
        }
      }

      // Try other variant sizes if large is not available
      const variantSizes = ['medium', 'small', 'thumbnail'];
      for (const size of variantSizes) {
        const variant = mediaItem.variants?.[size];
        if (variant) {
          if (variant.cdnUrl) return res.redirect(variant.cdnUrl);
          if (variant.urls?.webp) return res.redirect(getValidUrl(variant.urls.webp));
          if (variant.urls?.jpeg) return res.redirect(getValidUrl(variant.urls.jpeg));
          if (variant.url) return res.redirect(getValidUrl(variant.url));
        }
      }
    }

    // Handle single media (legacy support)
    if (post.media?.variants && post.media.variants.large) {
      // If CDN URL is available, redirect to it
      if (post.media.variants.large.cdnUrl) {
        return res.redirect(post.media.variants.large.cdnUrl);
      }
      // Use WebP or JPEG URL
      const url = post.media.variants.large.urls?.webp || post.media.variants.large.urls?.jpeg;
      if (url) {
        if (url.startsWith('http')) {
          return res.redirect(url);
        }
        return res.redirect(`${process.env.API_URL}/uploads/${url}`);
      }
    }

    // Handle legacy media structure
    if (post.media?.legacy) {
      // If CDN URL is available, redirect to it
      if (post.media.legacy.cdnUrl) {
        return res.redirect(post.media.legacy.cdnUrl);
      }
      // Use legacy URL
      if (post.media.legacy.url) {
        if (post.media.legacy.url.startsWith('http')) {
          return res.redirect(post.media.legacy.url);
        }
        return res.redirect(`${process.env.API_URL}/uploads/${post.media.legacy.url}`);
      }
    }

    // Handle direct media string
    if (typeof post.media === 'string') {
      if (post.media.startsWith('http')) {
        return res.redirect(post.media);
      }
      return res.redirect(`${process.env.API_URL}/uploads/${post.media}`);
    }

    return res.status(404).json({ error: 'Media not found' });
  } catch (error) {
    console.error('Get post media error:', error);
    res.status(500).json({ error: 'Error fetching post media' });
  }
};

export const deleteReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.user.toString() !== req.user.userId && post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Use $pull operator to remove the reply
    comment.replies.pull({ _id: req.params.replyId });
    await post.save();

    await Notification.deleteMany({
      post: post._id,
      comment: comment._id,
      type: 'reply'
    });

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ error: 'Error deleting reply' });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user has already reported this post
    const existingReport = await Report.findOne({
      post: postId,
      reporter: req.user.userId
    });

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }

    const report = new Report({
      post: postId,
      reporter: req.user.userId,
      reason
    });

    await report.save();

    res.status(201).json({ message: 'Post reported successfully' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ error: 'Error reporting post' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.userId && post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Use findOneAndUpdate to atomically remove the comment
    const updatedPost = await Post.findOneAndUpdate(
      { _id: req.params.postId },
      { $pull: { comments: { _id: req.params.commentId } } },
      { new: true } // Return the updated document
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found after update' });
    }

    await Notification.deleteMany({
      post: post._id,
      comment: req.params.commentId
    });

    await post.populate([
      { path: 'user', select: 'username profilePicture' },
      { path: 'taggedUsers', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      {
        path: 'comments',
        populate: [
          {
            path: 'user',
            select: 'username profilePicture'
          },
          {
            path: 'likes',
            select: 'username profilePicture'
          },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'username profilePicture'
            }
          }
        ]
      }
    ]);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
};
