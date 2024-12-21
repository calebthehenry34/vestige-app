import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { IpEncryption } from '../utils/encryption.js';
import bcrypt from 'bcryptjs';
import Follow from '../models/Follow.js';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    minlength: 3,
    sparse: true 
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  bio: {
    type: String,
    maxlength: 150,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  website: {
    type: String,
    trim: true,
    default: ''
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  firstLogin: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastLoginIP: String,
  lastLoginDate: Date,
  loginHistory: [{
    ip: String,
    date: Date,
    userAgent: String
  }],
  blockedReason: String,
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  location: {
    type: String,
    default: ''
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  lastIpAddress: {
    type: String,
    select: false
  },
  lastIpUpdateDate: {
    type: Date,
    select: false
  },
  acceptedGuidelines: {
    type: Boolean,
    default: false
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },

  
  // Subscription-related fields
  stripeCustomerId: {
    type: String,
    select: false
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'active', 'past_due', 'canceled'],
    default: 'inactive'
  },
  subscriptionTier: {
    type: String,
    enum: ['beta_tier', 'pro_tier', null],
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },

  // New video-related fields
  videoCount: {
    type: Number,
    default: 0
  },
  videoPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  savedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  videoSettings: {
    autoplay: {
      type: Boolean,
      default: true
    },
    defaultQuality: {
      type: String,
      enum: ['auto', '720p', '1080p'],
      default: 'auto'
    },
    muteByDefault: {
      type: Boolean,
      default: true
    }
  },
  contentPreferences: {
    showVideoFeed: {
      type: Boolean,
      default: true
    },
    videoNotifications: {
      type: Boolean,
      default: true
    }
  }

});

// Indexes
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
userSchema.index({ username: 1, email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Handle IP encryption
  if (this.isModified('lastIpAddress')) {
    try {
      const ipEncryption = new IpEncryption(process.env.IP_ENCRYPTION_KEY);
      this.lastIpAddress = ipEncryption.encrypt(this.lastIpAddress);
      this.lastIpUpdateDate = new Date();
    } catch (error) {
      return next(error);
    }
  }

  // Handle password hashing
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Pre-remove middleware to clean up user data
userSchema.pre('remove', async function(next) {
  try {
    const Post = mongoose.model('Post');
    const Notification = mongoose.model('Notification');
    const Message = mongoose.model('Message');
    const VerificationCode = mongoose.model('VerificationCode');
    const Report = mongoose.model('Report');
    const Blacklist = mongoose.model('Blacklist');

    // Delete all posts by the user
    await Post.deleteMany({ user: this._id });

    // Remove user's likes and comments from other posts
    await Post.updateMany(
      {}, 
      { 
        $pull: { 
          likes: this._id,
          'comments.user': this._id,
          'comments.likes': this._id,
          'comments.replies.user': this._id,
          taggedUsers: this._id
        }
      }
    );

    // Delete all notifications involving the user
    await Notification.deleteMany({
      $or: [
        { recipient: this._id },
        { sender: this._id }
      ]
    });

    // Delete all messages involving the user
    await Message.deleteMany({
      $or: [
        { sender: this._id },
        { recipient: this._id }
      ]
    });

    // Delete verification codes
    await VerificationCode.deleteMany({ user: this._id });

    // Remove user from followers/following lists of other users
    await mongoose.model('User').updateMany(
      {}, 
      { 
        $pull: { 
          followers: this._id,
          following: this._id,
          savedPosts: { $in: this.posts }
        }
      }
    );

    // Delete all follow relationships
    await Follow.deleteMany({
      $or: [
        { follower: this._id },
        { following: this._id }
      ]
    });

    // Clean up reports
    // Delete reports made by the user
    await Report.deleteMany({ reporter: this._id });
    // Remove user from handledBy field in reports
    await Report.updateMany(
      { handledBy: this._id },
      { $unset: { handledBy: 1 } }
    );
    // Delete reports for posts that were made by this user (since posts are being deleted)
    await Report.deleteMany({ post: { $in: this.posts } });

    // Remove user reference from blacklist entries they added
    // We keep the blacklist entries themselves as they may still be relevant
    await Blacklist.updateMany(
      { addedBy: this._id },
      { $unset: { addedBy: 1 } }
    );

    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.getDecryptedIp = function() {
  if (!this.lastIpAddress) return null;
  const ipEncryption = new IpEncryption(process.env.IP_ENCRYPTION_KEY);
  return ipEncryption.decrypt(this.lastIpAddress);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { userId: this._id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Virtuals
userSchema.virtual('followerCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'following',
  count: true
});

userSchema.virtual('followingCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'follower',
  count: true
});

userSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
  count: true
});

userSchema.virtual('videoEngagement', {
  ref: 'Post',
  localField: 'videoPosts',
  foreignField: '_id',
  count: true
});


export default mongoose.model('User', userSchema);
