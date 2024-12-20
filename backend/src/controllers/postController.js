import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/notification.js';
import s3, { isS3Available, getCredentials, getS3BucketName } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

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

// Helper function to generate pre-signed URL
const generatePresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: key
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
};

// Helper function to process posts with pre-signed URLs
const processPostsWithPresignedUrls = async (posts) => {
  if (!Array.isArray(posts)) {
    posts = [posts];
  }

  const processedPosts = await Promise.all(posts.map(async (post) => {
    const postObj = post.toObject ? post.toObject() : post;
    if (postObj.mediaKey && isS3Available()) {
      try {
        postObj.media = await generatePresignedUrl(postObj.mediaKey);
      } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        // Keep the original media URL as fallback
      }
    }
    return postObj;
  }));

  return Array.isArray(posts) ? processedPosts : processedPosts[0];
};

export const getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log the received ID
    console.log('Received post ID:', id);
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid post ID format:', id);
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

    // Log that we're attempting to find the post
    console.log('Attempting to find post with ID:', id);
    
    const post = await Post.findById(id)
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
      console.error('Post not found with ID:', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    // Log that we found the post
    console.log('Found post:', post._id);

    const processedPost = await processPostsWithPresignedUrls(post);
    res.json(processedPost);
  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({ error: 'Error fetching post', details: error.message });
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

export const createPost = async (req, res) => {
  console.log('Starting createPost');
  try {
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

    let hashtags = [];
    let taggedUsers = [];

    try {
      hashtags = hashtagsString ? JSON.parse(hashtagsString) : [];
      taggedUsers = taggedUsersString ? JSON.parse(taggedUsersString) : [];
    } catch (parseError) {
      console.error('Error parsing JSON strings:', parseError);
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }

    if (taggedUsers.length > 0) {
      const users = await User.find({ _id: { $in: taggedUsers } });
      if (users.length !== taggedUsers.length) {
        return res.status(400).json({ error: 'One or more tagged users do not exist' });
      }
      // Create tag notifications
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
    }

    try {
      const filename = `${crypto.randomUUID()}.jpg`;

      if (isS3Available()) {
        console.log('Uploading to S3...');
        try {
          const credentials = getCredentials();
          
          console.log('S3 Upload Credentials Check:', {
            hasAccessKey: !!credentials.accessKeyId,
            accessKeyLength: credentials.accessKeyId?.length,
            hasSecretKey: !!credentials.secretAccessKey,
            secretKeyLength: credentials.secretAccessKey?.length,
            region: process.env.AWS_REGION
          });

          key = `posts/${filename}`;

          const command = new PutObjectCommand({
            Bucket: getS3BucketName(),
            Key: key,
            Body: req.file.buffer,
            ContentType: 'image/jpeg',
            CacheControl: 'max-age=31536000'
          });

          const result = await s3.send(command);
          console.log('S3 upload response:', {
            requestId: result.$metadata?.requestId,
            attempts: result.$metadata?.attempts,
            totalTime: result.$metadata?.totalTime
          });

          // Generate pre-signed URL for immediate use
          mediaUrl = await generatePresignedUrl(key);
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
      
      await post.populate([
        { path: 'user', select: 'username profilePicture' },
        { path: 'taggedUsers', select: 'username profilePicture' }
      ]);
      
      const processedPost = await processPostsWithPresignedUrls(post);
      res.status(201).json(processedPost);
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

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const liked = post.likes.includes(req.user.userId);
    
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.userId);
      // Remove like notification if exists
      await Notification.deleteOne({
        recipient: post.user,
        sender: req.user.userId,
        type: 'like',
        post: post._id
      });
    } else {
      post.likes.push(req.user.userId);
      // Create notification for post like (only if the liker isn't the post owner)
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

// New comment endpoints
export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Extract mentioned users from the comment text
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex) || [];
    const mentionedUsernames = mentions.map(mention => mention.substring(1));

    // Find mentioned users in the database
    const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

    const comment = {
      text,
      user: req.user.userId,
      likes: [],
      replies: []
    };

    post.comments.push(comment);
    await post.save();

    // Create notification for post owner (if commenter isn't the post owner)
    if (post.user.toString() !== req.user.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.userId,
        type: 'comment',
        post: post._id,
        comment: post.comments[post.comments.length - 1]._id
      });
    }

    // Create notifications for mentioned users
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

    // Extract mentioned users from the reply text
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex) || [];
    const mentionedUsernames = mentions.map(mention => mention.substring(1));

    // Find mentioned users in the database
    const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

    const reply = {
      text,
      user: req.user.userId
    };

    comment.replies.push(reply);
    await post.save();

    // Create notification for comment owner (if replier isn't the comment owner)
    if (comment.user.toString() !== req.user.userId) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user.userId,
        type: 'reply',
        post: post._id,
        comment: comment._id
      });
    }

    // Create notifications for mentioned users
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
      // Remove like notification if exists
      await Notification.deleteOne({
        recipient: comment.user,
        sender: req.user.userId,
        type: 'commentLike',
        post: post._id,
        comment: comment._id
      });
    } else {
      comment.likes.push(req.user.userId);
      // Create notification for comment like (only if the liker isn't the comment owner)
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

    // Check if user is authorized to delete the comment
    if (comment.user.toString() !== req.user.userId && post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    comment.remove();
    await post.save();

    // Remove all notifications related to this comment
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

export const deleteReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not
