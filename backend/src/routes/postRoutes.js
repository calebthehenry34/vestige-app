import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as postController from '../controllers/postController.js';

const router = express.Router();

// Core post routes
router.get('/', auth, postController.getPosts);
router.get('/explore', auth, postController.getExplorePosts);
router.get('/user/:userId', auth, postController.getUserPosts);
router.get('/:postId', auth, postController.getSinglePost);
router.post('/', auth, upload.handleUpload('media'), postController.createPost);
router.put('/:postId', auth, postController.updatePost);
router.delete('/:postId', auth, postController.deletePost);
router.post('/:postId/like', auth, postController.likePost);

// Hashtag routes
router.get('/hashtag/:hashtag', auth, postController.getPostsByHashtag);

// Comment routes
router.post('/:postId/comments', auth, postController.addComment);
router.post('/:postId/comments/:commentId/replies', auth, postController.addReply);
router.post('/:postId/comments/:commentId/like', auth, postController.likeComment);
router.delete('/:postId/comments/:commentId', auth, postController.deleteComment);
router.delete('/:postId/comments/:commentId/replies/:replyId', auth, postController.deleteReply);

export default router;
