import express from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Blacklist from '../models/Blacklist.js';
import Follow from '../models/Follow.js'; 
import mongoose from 'mongoose';
import { deleteUser } from '../controllers/userController.js';



const router = express.Router();

// In your login route
router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
  
      // Include isAdmin in the response
      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin, // Add this line
          bio: user.bio,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  });

  // In adminRoutes.js, add this new route:
router.get('/users/:id/details', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('+lastIpAddress +lastIpUpdateDate');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Only decrypt IP if it exists and admin requests it
    let ipAddress = null;
    if (user.lastIpAddress) {
      try {
        ipAddress = user.getDecryptedIp();
      } catch (error) {
        console.error('IP decryption error:', error);
        ipAddress = 'Decryption failed';
      }
    }

    // Get follower and following counts
    const followerCount = await Follow.countDocuments({ following: user._id });
    const followingCount = await Follow.countDocuments({ follower: user._id });
    
    // Get post count
    const postCount = await Post.countDocuments({ user: user._id });

    // Compile user details
    const userDetails = {
      bio: user.bio,
      location: user.location,
      website: user.website,
      followerCount,
      followingCount,
      postCount,
      createdAt: user.createdAt,
      lastActive: user.lastActive || user.updatedAt,
      lastIpAddress: user.lastIpAddress,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastIpAddress: ipAddress,
      lastIpUpdateDate: user.lastIpUpdateDate

    };

    res.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});
  
// Get all users with pagination
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    res.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Create new user (in admin only)
router.post('/users', auth, adminAuth, async (req, res) => {
  try {
    const { username, email, role, password = 'defaultPassword123' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    const user = new User({
      username,
      email,
      role,
      password, // Will be hashed by the pre-save middleware
      isActive: true
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Update user
router.put('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const userId = req.params.id;

    // Check if updating email/username would conflict with existing user
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email or username already taken' 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          username,
          email,
          role,
          updatedAt: Date.now()
        } 
      },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
});

// Delete user
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await deleteUser(userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Error deleting user and associated data' });
  }
});

// Toggle user suspension
router.post('/users/:id/suspend', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle isActive status
    user.isActive = !user.isActive;
    await user.save();

    res.json({ 
      id: user._id, 
      isActive: user.isActive 
    });
  } catch (error) {
    console.error('Error toggling user suspension:', error);
    res.status(500).json({ error: 'Error updating user status' });
  }
});


// Get user statistics
router.get('/users/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const suspendedUsers = await User.countDocuments({ isActive: false });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const moderatorUsers = await User.countDocuments({ role: 'moderator' });

    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      admins: adminUsers,
      moderators: moderatorUsers,
      newLast30Days: newUsers
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ error: 'Error fetching user statistics' });
  }
});



// Block/Unblock user
router.post('/users/:id/toggle-block', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(id);
    user.isBlocked = !user.isBlocked;
    user.blockedReason = user.isBlocked ? reason : null;
    
    await user.save();
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error toggling user block status' });
  }
});

// Get analytics data
router.get('/analytics', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    const usersByLocation = await User.aggregate([
      { $group: { _id: "$location", count: { $sum: 1 } } }
    ]);

    res.json({
      totalUsers,
      totalPosts,
      newUsersToday,
      usersByLocation
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

// Analytics routes
router.get('/analytics', auth, adminAuth, async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalPosts = await Post.countDocuments();
      const newUsersToday = await User.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      });
  
      const userGrowthData = await User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]);
  
      const usersByLocation = await User.aggregate([
        {
          $group: {
            _id: "$location",
            count: { $sum: 1 }
          }
        }
      ]);
  
      res.json({
        totalUsers,
        totalPosts,
        newUsersToday,
        userGrowthData,
        usersByLocation
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Error fetching analytics' });
    }
  });
  
  // User management routes
  router.get('/users', auth, adminAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const users = await User.find()
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
  
      const total = await User.countDocuments();
  
      res.json({
        users,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching users' });
    }
  });
  
  // Block/Unblock user
  router.post('/users/:id/toggle-block', auth, adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.isBlocked = !user.isBlocked;
      user.blockedReason = user.isBlocked ? reason : null;
      await user.save();
  
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Error toggling user block status' });
    }
  });
  
  // Blacklist management routes
  router.get('/blacklist', auth, adminAuth, async (req, res) => {
    try {
      const ips = await Blacklist.find({ type: 'ip' }).sort('-createdAt');
      const emails = await Blacklist.find({ type: 'email' }).sort('-createdAt');
      res.json({ ips, emails });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching blacklist' });
    }
  });
  
  router.post('/blacklist', auth, adminAuth, async (req, res) => {
    try {
      const { type, value, reason } = req.body;
      const blacklistEntry = new Blacklist({
        type,
        value,
        reason,
        addedBy: req.user.userId
      });
      await blacklistEntry.save();
      res.status(201).json(blacklistEntry);
    } catch (error) {
      res.status(500).json({ error: 'Error adding to blacklist' });
    }
  });
  
  router.delete('/users/:id', auth, adminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await deleteUser(userId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Error deleting user and associated data' });
    }
  });
  
  // Reports and exports
  router.get('/reports', auth, adminAuth, async (req, res) => {
    try {
      const range = req.query.range || 'week';
      let dateFilter;
  
      switch (range) {
        case 'week':
          dateFilter = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'month':
          dateFilter = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
          break;
        case 'year':
          dateFilter = { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) };
          break;
        default:
          dateFilter = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      }
  
      const userGrowth = await User.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      const activity = await Post.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            posts: { $sum: 1 },
            comments: { $sum: { $size: "$comments" } }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      const demographics = await User.aggregate([
        {
          $group: {
            _id: "$location",
            users: { $sum: 1 },
            posts: { $sum: { $cond: [{ $isArray: "$posts" }, { $size: "$posts" }, 0] } }
          }
        },
        {
          $project: {
            location: "$_id",
            users: 1,
            posts: 1,
            engagementRate: {
              $multiply: [
                { $divide: ["$posts", "$users"] },
                100
              ]
            }
          }
        }
      ]);
  
      res.json({
        userGrowth,
        activity,
        demographics
      });
    } catch (error) {
      res.status(500).json({ error: 'Error generating reports' });
    }
  });
  
  // Export data
  router.get('/export', auth, adminAuth, async (req, res) => {
    try {
      const { type } = req.query;
      let data;
  
      if (type === 'users') {
        data = await User.find().select('-password').lean();
      } else if (type === 'activity') {
        data = await Post.find().populate('user', 'username').lean();
      }
  
      // Convert to CSV
      const csv = convertToCSV(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${type}-export.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Error exporting data' });
    }

    // Update password directly
router.put('/users/:id/password', auth, adminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Password will be hashed by the User model pre-save middleware
    user.password = password;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Send password reset link
router.post('/users/:id/reset-password', auth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this email because a password reset has been requested for your account.\n\n
             Please click on the following link to reset your password:\n\n
             ${resetUrl}\n\n
             This link will expire in 1 hour.\n\n
             If you did not request this, please ignore this email.`
    });

    res.json({ message: 'Reset link sent successfully' });
  } catch (error) {
    console.error('Error sending reset link:', error);
    res.status(500).json({ error: 'Failed to send reset link' });
  }
});
    
router.get('/users/:id/details', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get follower and following counts
    const followerCount = await Follow.countDocuments({ following: user._id });
    const followingCount = await Follow.countDocuments({ follower: user._id });
    const postCount = await Post.countDocuments({ user: user._id });

    const userDetails = {
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      followerCount,
      followingCount,
      postCount,
      createdAt: user.createdAt,
      lastActive: user.lastActive || user.updatedAt,
      lastIpAddress: user.lastIpAddress || ''
    };

    res.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});
  
router.put('/users/:id/password', auth, adminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;

    // Validate inputs
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password
    user.password = password;  // Will be hashed by pre-save middleware
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }

  });
   });
export default router