import { check } from 'express-validator';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queueEmail } from '../services/emailService.js';
import { inappropriateTerms } from '../utils/inappropriateTerms.js';

// Validation rules
export const registerValidation = [
  check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom(value => {
      if (value.endsWith('.internal')) {
        throw new Error('Invalid email domain');
      }
      return true;
    }),
  check('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  check('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z]).{8,16}$/)
    .withMessage('Password must be 8-16 characters and include upper and lowercase letters')
];

export const sendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      // Delete any existing verification codes for this email
      await VerificationCode.deleteMany({ email });
      
      // Create new verification code
      await VerificationCode.create({
        email,
        code,
        verified: false
      });

      // Queue the verification email
      await queueEmail({
        to: email,
        templateId: 'verification',
        templateData: {
          code,
          ipAddress: req.ip || 'Unknown'
        },
        priority: 1
      });

      res.json({ message: 'Verification code sent' });
    } catch (error) {
      console.error('Error in verification process:', error);
      
      // Clean up verification code if email fails
      await VerificationCode.deleteMany({ email });
      
      // Provide a user-friendly error message
      if (error.code === 'MessageRejected') {
        return res.status(400).json({ error: 'Unable to send email to this address' });
      }
      
      throw error; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      error: 'Failed to send verification code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Email and verification code are required' 
      });
    }

    const verificationData = await VerificationCode.findOne({ email });

    if (!verificationData) {
      return res.status(400).json({ 
        error: 'No verification code found. Please request a new code.' 
      });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ 
        error: 'Invalid verification code' 
      });
    }

    // Check if code is expired (15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (verificationData.createdAt < fifteenMinutesAgo) {
      await VerificationCode.deleteOne({ email });
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new code.' 
      });
    }

    // Mark as verified
    verificationData.verified = true;
    await verificationData.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if all required fields are present
    if (!email || !password || !username) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          username: !username ? 'Username is required' : null
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Check if email was verified
    const verificationData = await VerificationCode.findOne({ 
      email,
      verified: true
    });
    
    if (!verificationData) {
      return res.status(400).json({ 
        error: 'Email not verified. Please verify your email first.' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      email,
      username,
      password: hashedPassword,
      firstLogin: true,
      onboardingComplete: false,
      isAdmin: false
    });

    await user.save();

    // Clean up verification code
    await VerificationCode.deleteOne({ email });

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstLogin: true,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ 
        available: false,
        reason: 'Username is required'
      });
    }

    // Check length
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        available: false,
        reason: 'Username must be between 3 and 20 characters'
      });
    }

    // Check for valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ 
        available: false,
        reason: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Check against inappropriate terms
    const lowercaseUsername = username.toLowerCase();
    if (inappropriateTerms.some(term => lowercaseUsername.includes(term))) {
      return res.status(400).json({ 
        available: false,
        reason: 'This username is not allowed'
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    res.json({ 
      available: !existingUser,
      reason: existingUser ? 'Username is already taken' : null
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Error checking username' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Use the model's comparePassword method instead of direct bcrypt comparison
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        isAdmin: Boolean(user.isAdmin),
        bio: user.bio,
        profilePicture: user.profilePicture,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password');
      
    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
};
