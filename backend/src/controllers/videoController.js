// controllers/videoController.js
import Post from '../models/Post.js';
import User from '../models/User.js';

const videoController = {
  // Get all video posts
  getVideoPosts: async (req, res) => {
    try {
      const videoPosts = await Post.find({ type: 'video' })
        .populate('user', 'username profilePicture')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
            select: 'username profilePicture'
          }
        })
        .sort({ createdAt: -1 });

      res.json(videoPosts);
    } catch (error) {
      console.error('Error fetching video posts:', error);
      res.status(500).json({ message: 'Error fetching video posts' });
    }
  },

  // Create a new video post
  createVideoPost: async (req, res) => {
    try {
      const { caption } = req.body;
      const videoUrl = req.file?.filename;

      if (!videoUrl) {
        return res.status(400).json({ message: 'No video file provided' });
      }

      const allowedTypes = ['mp4', 'mov', 'avi', 'webm'];
      const fileExtension = videoUrl.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        return res.status(400).json({ message: 'Invalid video format' });
      }

      const newPost = new Post({
        user: req.user.id,
        type: 'video',
        videoUrl,
        caption,
        likes: [],
        comments: []
      });

      await newPost.save();

      const populatedPost = await Post.findById(newPost._id)
        .populate('user', 'username profilePicture');

      res.status(201).json(populatedPost);
    } catch (error) {
      console.error('Error creating video post:', error);
      res.status(500).json({ message: 'Error creating video post' });
    }
  },

  // Delete a video post
  deleteVideoPost: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (post.user.toString() !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await post.deleteOne();
      res.json({ message: 'Video post deleted' });
    } catch (error) {
      console.error('Error deleting video post:', error);
      res.status(500).json({ message: 'Error deleting video post' });
    }
  }
};

export default videoController;