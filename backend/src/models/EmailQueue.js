import mongoose from 'mongoose';

const emailQueueSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true,
    default: process.env.EMAIL_FROM
  },
  subject: String,
  html: String,
  templateId: String,
  templateData: Object,
  priority: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'sent', 'failed'],
    default: 'queued'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  trackingId: String,
  trackingData: {
    opened: { type: Boolean, default: false },
    openedAt: Date,
    ipAddress: String,
    userAgent: String
  },
  error: String
}, {
  timestamps: true
});

export default mongoose.model('EmailQueue', emailQueueSchema);
