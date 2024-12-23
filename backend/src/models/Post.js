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

// Define schema for image variants
const imageVariantSchema = new mongoose.Schema({
  dimensions: {
    width: Number,
    height: Number
  },
  urls: {
    webp: String,
    jpeg: String
  }
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
  // Media structure supporting both single and multiple items
  media: {
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    variants: {
      thumbnail: imageVariantSchema,
      small: imageVariantSchema,
      medium: imageVariantSchema,
      large: imageVariantSchema
    },
    metadata: {
      originalWidth: Number,
      originalHeight: Number,
      format: String,
      size: Number
    },
    placeholder: String,
    legacy: {
      url: String,
      key: String
    }
  },
  // New field for multiple media items
  mediaItems: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    variants: {
      thumbnail: imageVariantSchema,
      small: imageVariantSchema,
      medium: imageVariantSchema,
      large: imageVariantSchema
    },
    metadata: {
      originalWidth: Number,
      originalHeight: Number,
      format: String,
      size: Number
    },
    placeholder: String
  }],
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

// Virtual for comment count with null check
postSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for like count with null check
postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Helper method to get image URLs for a specific media item
postSchema.methods.getImageUrl = function(index = 0, size = 'medium', preferWebP = true) {
  // Handle legacy single media
  if (index === 0 && (!this.mediaItems || this.mediaItems.length === 0)) {
    if (!this.media || !this.media.variants) {
      return this.media?.legacy?.url || null;
    }
    const variant = this.media.variants[size] || this.media.variants.medium;
    if (!variant) {
      return this.media.legacy?.url || null;
    }
    return preferWebP ? variant.urls.webp : variant.urls.jpeg;
  }

  // Handle media items array
  if (!this.mediaItems || !this.mediaItems[index]) {
    return null;
  }

  const mediaItem = this.mediaItems[index];
  const variant = mediaItem.variants[size] || mediaItem.variants.medium;
  if (!variant) {
    return null;
  }

  return preferWebP ? variant.urls.webp : variant.urls.jpeg;
};

// Helper method to get srcset for responsive images
postSchema.methods.getImageSrcset = function(index = 0, preferWebP = true) {
  // Handle legacy single media
  if (index === 0 && (!this.mediaItems || this.mediaItems.length === 0)) {
    if (!this.media || !this.media.variants) {
      return '';
    }
    const format = preferWebP ? 'webp' : 'jpeg';
    return Object.entries(this.media.variants)
      .map(([size, variant]) => {
        if (!variant.urls[format]) return '';
        return `${variant.urls[format]} ${variant.dimensions.width}w`;
      })
      .filter(Boolean)
      .join(', ');
  }

  // Handle media items array
  if (!this.mediaItems || !this.mediaItems[index]) {
    return '';
  }

  const format = preferWebP ? 'webp' : 'jpeg';
  return Object.entries(this.mediaItems[index].variants)
    .map(([size, variant]) => {
      if (!variant.urls[format]) return '';
      return `${variant.urls[format]} ${variant.dimensions.width}w`;
    })
    .filter(Boolean)
    .join(', ');
};

// Ensure virtuals are included in JSON output
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

const Post = mongoose.model('Post', postSchema);
export default Post;
