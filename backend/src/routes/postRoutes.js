import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as postController from '../controllers/postController.js';

const router = express.Router();

// Core post routes
router.get('/', auth, postController.getPosts);
router.get('/explore', auth, postController.getExplorePosts);
router.get('/user/:userId', auth, postController.getUserPosts);
router.get('/:id', auth, postController.getSinglePost);
router.post('/', auth, upload.handleUpload('media'), postController.createPost);
router.put('/:id', auth, postController.updatePost);
router.delete('/:id', auth, postController.deletePost);
router.post('/:id/like', auth, postController.likePost);

// Hashtag routes
router.get('/hashtag/:hashtag', auth, postController.getPostsByHashtag);

// Comment routes
router.post('/:id/comments', auth, postController.addComment);
router.post('/:postId/comments/:commentId/replies', auth, postController.addReply);
router.post('/:postId/comments/:commentId/like', auth, postController.likeComment);
router.delete('/:postId/comments/:commentId', auth, postController.deleteComment);
router.delete('/:postId/comments/:commentId/replies/:replyId', auth, postController.deleteReply);

export default router;
