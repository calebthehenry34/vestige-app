// models/Post.js
import mongoose from 'mongoose';

// Define replySchema first
const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentionedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Then define commentSchema using replySchema
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

// Image adjustments schema
const imageAdjustmentsSchema = new mongoose.Schema({
  brightness: { type: Number, default: 100 },
  contrast: { type: Number, default: 100 },
  saturation: { type: Number, default: 100 },
  blur: { type: Number, default: 0 },
  temperature: { type: Number, default: 0 }
}, { _id: false });

// Finally define postSchema using commentSchema
const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: String,
  location: String,
  hashtags: [String],
  taggedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  media: String, // Full size image URL
  thumbnail: String, // Thumbnail image URL
  mediaKey: String, // S3 key for full size image
  thumbnailKey: String, // S3 key for thumbnail
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  imageAdjustments: {
    type: imageAdjustmentsSchema,
    default: () => ({})
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtuals are included in JSON output
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

const Post = mongoose.model('Post', postSchema);
export default Post;
