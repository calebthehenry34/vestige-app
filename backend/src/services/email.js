import Email from '../models/Email.js';
import nodemailer from 'nodemailer';
import aws from '@aws-sdk/client-ses';

// Create SES client
const ses = new aws.SES({
    region: process.env.EMAIL_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Create transporter using SES
const transporter = nodemailer.createTransport({
    SES: { ses, aws },
    sendingRate: process.env.EMAIL_RATE_LIMIT || 1 // emails per second
});

export const sendEmail = async ({ to, subject, html, type }) => {
    let email;
    try {
        // Create email record
        email = new Email({
            to,
            from: process.env.EMAIL_FROM || 'support@vestigeapp.com',
            subject,
            html,
            type
        });

        // Send email
        await transporter.sendMail({
            from: email.from,
            to: email.to,
            subject: email.subject,
            html: email.html
        });

        // Update status
        email.status = 'sent';
        await email.save();

        return email;

    } catch (error) {
        console.error('Email sending failed:', error);
        if (email) {
            email.status = 'failed';
            email.error = error.message;
            await email.save();
        }
        throw error;
    }
};

export const sendVerificationEmail = async (email, code) => {
    return sendEmail({
        to: email,
        subject: 'Verify your email address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Vestige!</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 4px; color: #3b82f6;">${code}</h1>
                <p>This code will expire in 15 minutes.</p>
            </div>
        `,
        type: 'verification'
    });
};
