import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../services/emailService.js';
import { check, validationResult } from 'express-validator';
import { queueEmail } from '../services/emailService.js';

// List of inappropriate terms
const inappropriateTerms = [
  'admin',
  'administrator',
  'mod',
  'moderator',
  'support',
  'help',
  'staff',
  'system',
  'vestige',
  'official',
  // Add more terms as needed
];

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

export const register = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('Registration attempt:', req.body); // Add logging
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
    const verificationData = verificationCodes.get(email);
    console.log('Verification data:', verificationData); // Add logging

    if (!verificationData?.verified) {
      return res.status(400).json({ 
        error: 'Email not verified',
        details: 'Please verify your email first'
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
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const sendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email domain
    if (email.endsWith('.internal')) {
      return res.status(400).json({ error: 'Invalid email domain' });
    }


    const code = Math.floor(100000 + Math.random() * 900000).toString();
    

    // Store verification code with timestamp
    verificationCodes.set(email, {
      code,
      timestamp: Date.now(),
      verified: false
    });

    console.log('Stored verification:', {
      email,
      code,
      stored: verificationCodes.get(email)
    });


    // Delete any existing verification codes for this email
    await VerificationCode.deleteMany({ email });
    
    // Create new verification code
    await VerificationCode.create({
      email,
      code,
      verified: false
    });

    await queueEmail({
      to: email,
      templateId: 'verification',
      templateData: {
        code,
        ipAddress: req.ip || 'Unknown'
      },
      priority: 1 // High priority for verification emails
    });

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('Verifying code:', { email, code });
    const verificationData = await VerificationCode.findOne({ email });

    if (!verificationData) {
      return res.status(400).json({ 
        error: 'No verification code found',
        details: 'Please request a new code'
      });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ 
         error: 'Invalid verification code',
        details: 'Code does not match'
      });
    }

    if (Date.now() - verificationData.timestamp > 15 * 60 * 1000) {
      verificationCodes.delete(email);
      return res.status(400).json({ 
        error: 'Verification code expired',
        details: 'Please request a new code'
      });
    }

     // Mark as verified
     verificationCodes.set(email, {
      ...verificationData,
      verified: true
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

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
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
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