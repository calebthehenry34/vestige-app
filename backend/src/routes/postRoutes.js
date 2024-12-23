import express from 'express';
import multer from 'multer';
import {
  getPosts,
  getExplorePosts,
  getUserPosts,
  getSinglePost,
  createPost,
  createMultiImagePost,
  updatePost,
  deletePost,
  likePost,
  getPostsByHashtag,
  addComment,
  addReply,
  likeComment,
  getPostMedia,
  deleteReply,
  reportPost,
  deleteComment
} from '../controllers/postController.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/explore', getExplorePosts);
router.get('/hashtag/:hashtag', getPostsByHashtag);
router.get('/media/:postId', getPostMedia);

// Protected routes
router.use(auth);
router.get('/', getPosts);
router.get('/user/:userId', getUserPosts);
router.get('/:postId', getSinglePost);
router.post('/', upload.single('media'), createPost);
router.post('/multi', upload.array('images', 10), createMultiImagePost);
router.patch('/:postId', updatePost);
router.delete('/:postId', deletePost);
router.post('/:postId/like', likePost);
router.post('/:postId/comments', addComment);
router.post('/:postId/comments/:commentId/replies', addReply);
router.post('/:postId/comments/:commentId/like', likeComment);
router.delete('/:postId/comments/:commentId/replies/:replyId', deleteReply);
router.post('/:postId/report', reportPost);
router.delete('/:postId/comments/:commentId', deleteComment);

export default router;
