import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../services/emailService.js';
import { check, validationResult } from 'express-validator';
import { queueEmail } from '../services/emailService.js';

// Validation rules
export const registerValidation = [
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
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
        error: 'Email not verified' 
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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
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
    const verificationData = await VerificationCode.findOne({ email });

    if (!verificationData) {
      return res.status(400).json({ 
        error: 'No verification code found' 
      });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ 
        error: 'Invalid verification code' 
      });
    }

    // Mark as verified
    verificationData.verified = true;
    await verificationData.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Verification failed' });
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

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ error: 'Error checking username' });
  }
};
