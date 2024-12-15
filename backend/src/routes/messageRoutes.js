// backend/src/routes/messageRoutes.js
import express from 'express';
import auth from '../middleware/auth.js';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

router.post('/', auth, messageController.sendMessage);
router.get('/:recipientId', auth, messageController.getMessages);
router.get('/chats', auth, messageController.getChats);


export default router;