import Post from '../models/Post.js';
import s3 from '../config/s3.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Notification from '../models/notification.js';

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 })
      .exec();

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

export const createPost = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Request user:', req.user);
 
    const { caption } = req.body;
    let mediaUrl = '';
    let mediaType = req.body.mediaType || 'text';
 
    if (req.file) {
      try {
        const fileId = uuidv4();
        const fileExt = req.file.mimetype.split('/')[1];
        const key = `posts/${fileId}.${fileExt}`;
 
        if (req.file.mimetype.startsWith('image/')) {
          const processedImage = await sharp(req.file.buffer)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
 
          await s3.upload({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: processedImage,
            ContentType: 'image/jpeg'
          }).promise();
 
          mediaType = 'image';
        } else {
          await s3.upload({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          }).promise();
 
          mediaType = 'video';
        }
 
        mediaUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Error uploading file to S3' });
      }
    }
 
    
    const post = new Post({
      user: req.user.userId,
      caption,
      media: mediaUrl,
      mediaType,
      likes: [],
      comments: []
    });
 
    await post.save();
    
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username profilePicture');
 
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ error: error.message || 'Error creating post' });
  }
};


export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profilePicture'
        }
      });
      
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
};


export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const likeIndex = post.likes.indexOf(req.user.userId);
    if (likeIndex === -1) {
      post.likes.push(req.user.userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling like' });
  }
};

export const toggleSave = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // First find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize savedPosts array if it doesn't exist
    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    // Check if post is already saved
    const postIndex = user.savedPosts.indexOf(postId);
    if (postIndex > -1) {
      // Post is already saved, remove it
      user.savedPosts.splice(postIndex, 1);
    } else {
      // Post is not saved, add it
      user.savedPosts.push(postId);
    }

    await user.save();

    res.json({ 
      success: true, 
      saved: postIndex === -1, 
      savedPosts: user.savedPosts 
    });
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
};

// Like/unlike comment
export const toggleCommentLike = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1); // Unlike
    } else {
      comment.likes.push(userId); // Like
      
      // Create notification if the comment is not user's own
      if (comment.user.toString() !== userId) {
        await Notification.create({
          recipient: comment.user,
          sender: userId,
          type: 'commentLike',
          post: postId,
          comment: commentId
        });
      }
    }

    await post.save();
    res.json({ success: true, likes: comment.likes.length });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = {
      text,
      user: userId,
      mentionedUser: comment.user,
      createdAt: new Date()
    };

    comment.replies.push(reply);
    await post.save();

    // Create notification for reply
    if (comment.user.toString() !== userId) {
      await Notification.create({
        recipient: comment.user,
        sender: userId,
        type: 'reply',
        post: postId,
        comment: commentId
      });
    }

    // Populate user info for the new reply
    await post.populate('comments.replies.user', 'username profilePicture');
    await post.populate('comments.replies.mentionedUser', 'username');
    
    const addedReply = comment.replies[comment.replies.length - 1];
    res.status(201).json(addedReply);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    post.comments = post.comments.filter(
      comment => comment._id.toString() !== req.params.commentId
    );
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error deleting comment' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete from S3 if there's media
    if (post.media) {
      const key = post.media.split('.com/')[1];
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      }).promise();
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting post' });
  }
};
// In postController.js, add:
export const reportPost = async (req, res) => {
  try {
    const report = new Report({
      post: req.params.id,
      reporter: req.user.userId,
      reason: req.body.reason
    });
    
    await report.save();
    res.status(201).json({ message: 'Post reported successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error reporting post' });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('post')
      .populate('reporter', 'username')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching reports' });
  }
};

export const handleReport = async (req, res) => {
  try {
    const { action } = req.body;
    const report = await Report.findById(req.params.id)
      .populate('post')
      .populate('reporter');

    if (action === 'remove') {
      await Post.findByIdAndDelete(report.post._id);
    }

    report.status = action;
    report.handledBy = req.user.userId;
    await report.save();

    res.json({ message: 'Report handled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error handling report' });
  }
};
   


export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    
    const newComment = {
      text: text.trim(),
      user: userId,
      likes: [],
      replies: [],
      createdAt: new Date()
    };

    post.comments = Array.isArray(post.comments) ? post.comments : [];
    post.comments.push(newComment);

    await post.save();
    await post.populate('comments.user', 'username profilePicture');
    
    const addedComment = post.comments[post.comments.length - 1];

    res.status(201).json(addedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message
    });
  }
};

const getVideoPosts = async (req, res) => {
  try {
    const videoPosts = await Post.find({ mediaType: 'video' })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json(videoPosts);
  } catch (error) {
    console.error('Error fetching video posts:', error);
    res.status(500).json({ error: 'Error fetching video posts' });
  }
};

export { getVideoPosts };


export const getExplorePosts = async (req, res) => {
  try {
    const { sort } = req.query;
    
    const query = Post.find()
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePicture' }
      });

    // Apply sorting
    if (sort === 'oldest') {
      query.sort({ createdAt: 1 });
    } else {
      query.sort({ createdAt: -1 }); // default newest first
    }

    const posts = await query;
    res.json(posts);

  } catch (error) {
    console.error('Error in getExplorePosts:', error);
    res.status(500).json({ message: 'Error fetching explore posts' });
  }
};

