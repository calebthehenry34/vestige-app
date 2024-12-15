// models/Email.js
import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    subject: String,
    html: String,
    sentAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['verification', 'notification', 'system'],
        required: true
    }
});

export default mongoose.model('Email', emailSchema);