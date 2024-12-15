// backend/src/routes/postRoutes.js
import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as postController from '../controllers/postController.js';

const router = express.Router();

router.get('/videos', auth, postController.getVideoPosts); 
router.get('/explore', auth, postController.getExplorePosts);
router.get('/:id', auth, postController.getPost);
router.get('/', auth, postController.getPosts);
router.post('/create', auth, upload.single('media'), postController.createPost);
router.post('/:id/like', auth, postController.toggleLike);
router.post('/:id/save', auth, postController.toggleSave);
router.post('/:postId/comment', auth, postController.addComment);
router.post('/:postId/comments/:commentId/like', auth, postController.toggleCommentLike);
router.post('/:postId/comments/:commentId/reply', auth, postController.addReply);




// In your backend postRoutes.js
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId; // Make sure this matches your auth middleware

    console.log('Attempting to add comment:', {
      postId,
      text,
      userId
    });

    const post = await Post.findById(postId);
    if (!post) {
      console.log('Post not found:', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
      text,
      user: userId,
      createdAt: new Date()
    };

    post.comments = post.comments || []; // Ensure comments array exists
    post.comments.push(newComment);
    await post.save();

    // Populate user info for the new comment
    await post.populate('comments.user', 'username profilePicture');
    const addedComment = post.comments[post.comments.length - 1];

    console.log('Successfully added comment:', addedComment);
    res.status(201).json(addedComment);

  } catch (error) {
    console.error('Server error while adding comment:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

// Comment route
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
      text,
      user: userId,
      createdAt: new Date()
    };

    post.comments = post.comments || [];
    post.comments.push(newComment);
    await post.save();

    // Populate user info
    await post.populate('comments.user', 'username profilePicture');
    const addedComment = post.comments[post.comments.length - 1];

    res.status(201).json(addedComment);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

export default router;