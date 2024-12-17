import express from 'express';
import { sendVerificationEmail, queueEmail } from '../services/emailService.js';

const router = express.Router();

// Test route for direct email sending
router.post('/test-direct', async (req, res) => {
    try {
        console.log('Testing direct email send...');
        const result = await sendVerificationEmail(
            req.body.email || 'test@example.com',
            '123456'
        );
        
        console.log('Direct email test result:', result);
        res.json({
            message: 'Test email sent successfully',
            result
        });
    } catch (error) {
        console.error('Email test error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            error: 'Failed to send test email',
            details: error.message,
            code: error.code
        });
    }
});

// Test route for queued email
router.post('/test-queue', async (req, res) => {
    try {
        console.log('Testing email queue...');
        const result = await queueEmail({
            to: req.body.email || 'test@example.com',
            templateId: 'verification',
            templateData: {
                code: '123456',
                ipAddress: req.ip
            },
            priority: 1 // High priority for testing
        });
        
        console.log('Queue test result:', result);
        res.json({
            message: 'Test email queued successfully',
            result
        });
    } catch (error) {
        console.error('Email queue test error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            error: 'Failed to queue test email',
            details: error.message,
            code: error.code
        });
    }
});

export default router;
