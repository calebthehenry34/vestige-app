import express from 'express';
import { check } from 'express-validator';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  check('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z]).{8,16}$/)
    .withMessage('Password must be 8-16 characters and include upper and lowercase letters')
];

// Routes using controller methods
router.post('/send-verification', authController.sendVerification);
router.post('/verify-code', authController.verifyCode);
router.post('/register', registerValidation, authController.register);
router.post('/login', authController.login);
router.get('/check-username', authController.checkUsername);

export default router;
