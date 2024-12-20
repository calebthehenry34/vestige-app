import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as postController from '../controllers/postController.js';

const router = express.Router();

// Core post routes
router.get('/', auth, postController.getPosts);
router.get('/explore', auth, postController.getExplorePosts);
router.get('/user/:userId', auth, postController.getUserPosts);
router.get('/:id', auth, postController.getSinglePost); // Added route for getting a single post
router.post('/', auth, upload.handleUpload('media'), postController.createPost);
router.put('/:id', auth, postController.updatePost);
router.delete('/:id', auth, postController.deletePost);
router.post('/:id/like', auth, postController.likePost);

export default router;
