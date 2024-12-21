import Post from '../models/Post.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Notification from '../models/notification.js';
import s3, { isS3Available, getCredentials, getS3BucketName } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import imageProcessingService from '../services/imageProcessingService.js';
import s3UploadService from '../utils/s3Upload.js';

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
const processPostsWithPresignedUrls = async (posts) => {
  if (!Array.isArray(posts)) {
    posts = [posts];
  }

  const processedPosts = await Promise.all(posts.map(async (post) => {
    const postObj = post.toObject ? post.toObject() : post;
    
    // Handle legacy posts (old format)
    if (postObj.mediaKey && !postObj.media?.variants) {
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
        // Keep the original media URL as fallback
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
    else if (postObj.media?.variants && isS3Available()) {
      try {
        // No need to generate pre-signed URLs as they're now handled by the S3UploadService
        // Just ensure the post object structure is correct
        postObj.media = {
          type: postObj.media.type || 'image',
          variants: postObj.media.variants,
          metadata: postObj.media.metadata,
          placeholder: postObj.media.placeholder
        };
      } catch (error) {
        console.error('Error processing post with variants:', error);
      }
    }
    
    return postObj;
  }));

  return Array.isArray(posts) ? processedPosts : processedPosts[0];
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

    const posts = await Post.find()
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

    const user = await User.findById(req.user.userId);
    const following = user.following || [];

    const posts = await Post.aggregate([
      {
        $match: {
          user: { $nin: [user._id, ...following] }
        }
      },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          commentsCount: { $size: { $ifNull: ["$comments", []] } },
          popularity: {
            $add: [
              { $size: { $ifNull: ["$likes", []] } },
              { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] }
            ]
          }
        }
      },
      {
        $sort: { popularity: -1, createdAt: -1 }
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

    const total = await Post.countDocuments({
      user: { $nin: [user._id, ...following] }
    });

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
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    
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
      return res.status(404).json({ error: 'Post not found' });
    }

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({ error: 'Error fetching post' });
  }
};

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

    const filename = `${crypto.randomUUID()}.jpg`;

    if (isS3Available()) {
      try {
        key = `posts/${filename}`;
        const command = new PutObjectCommand({
          Bucket: getS3BucketName(),
          Key: key,
          Body: req.file.buffer,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=31536000'
        });

        await s3.send(command);
        mediaUrl = await generatePresignedUrl(key);
      } catch (s3Error) {
        throw new Error(`Failed to upload to S3: ${s3Error.message}`);
      }
    } else {
      mediaUrl = await storeFileLocally(req.file.buffer, filename);
      key = filename;
    }

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
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (post.mediaKey) {
      try {
        if (isS3Available()) {
          await s3.send(new DeleteObjectCommand({
            Bucket: getS3BucketName(),
            Key: post.mediaKey
          }));
        } else {
          const filePath = path.join(process.cwd(), 'uploads', post.mediaKey);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
      } catch (deleteError) {
        console.error('Error deleting media:', deleteError);
      }
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const liked = post.likes.includes(req.user.userId);
    
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.userId);
      await Notification.deleteOne({
        recipient: post.user,
        sender: req.user.userId,
        type: 'like',
        post: post._id
      });
    } else {
      post.likes.push(req.user.userId);
      if (post.user.toString() !== req.user.userId) {
        await Notification.create({
          recipient: post.user,
          sender: req.user.userId,
          type: 'like',
          post: post._id
        });
      }
    }

    await post.save();
    
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
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const liked = comment.likes.includes(req.user.userId);
    
    if (liked) {
      comment.likes = comment.likes.filter(id => id.toString() !== req.user.userId);
      await Notification.deleteOne({
        recipient: comment.user,
        sender: req.user.userId,
        type: 'commentLike',
        post: post._id,
        comment: comment._id
      });
    } else {
      comment.likes.push(req.user.userId);
      if (comment.user.toString() !== req.user.userId) {
        await Notification.create({
          recipient: comment.user,
          sender: req.user.userId,
          type: 'commentLike',
          post: post._id,
          comment: comment._id
        });
      }
    }

    await post.save();

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

    reply.remove();
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

    comment.remove();
    await post.save();

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
