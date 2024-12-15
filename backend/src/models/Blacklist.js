// backend/src/models/Blacklist.js
import mongoose from 'mongoose';

const blacklistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ip', 'email'],
    required: true
  },
  value: {
    type: String,
    required: true,
    unique: true
  },
  reason: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Blacklist', blacklistSchema);