import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { check, validationResult } from 'express-validator';
import { queueEmail } from '../services/emailService.js'; 
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Store verification codes temporarily (in production, use Redis)
const verificationCodes = new Map();

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

// Send verification code
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with timestamp
    verificationCodes.set(email, {
      code,
      timestamp: Date.now(),
      verified: false
    });

    console.log('Verification code for testing:', code); // For development only

    // In production, send email here
    // await sendVerificationEmail(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('Received verification request:', { email, code });
    
    const verificationData = verificationCodes.get(email);
    console.log('Stored verification data:', verificationData);

    if (!verificationData) {
      return res.status(400).json({ error: 'No verification code found' });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ 
        error: 'Invalid verification code',
        provided: code,
        expected: verificationData.code 
      });
    }

    // Check if code is expired (15 minutes)
    if (Date.now() - verificationData.timestamp > 15 * 60 * 1000) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    // Mark as verified
    verificationCodes.set(email, {
      ...verificationData,
      verified: true
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Registration attempt for:', email);

    // Check if email was verified
    const verificationData = verificationCodes.get(email);
    if (!verificationData?.verified) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user without username
    const user = new User({
      email,
      password: hashedPassword,
      firstLogin: true,
      onboardingComplete: false
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Clear verification data
    verificationCodes.delete(email);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstLogin: true,
        onboardingComplete: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
        bio: user.bio,
        profilePicture: user.profilePicture,
        firstLogin: user.firstLogin,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Username availability check
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    const existingUser = await User.findOne({ username });
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ error: 'Error checking username availability' });
  }
});

router.get('/check-username', authController.checkUsername);

export default router;