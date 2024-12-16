import Email from '../models/Email.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
});

export const sendEmail = async ({ to, subject, html, type }) => {
    try {
        // Create email record
        const email = new Email({
            to,
            from: 'support@vestigeapp.com',
            subject,
            html,
            type
        });

        // Send email
        await transporter.sendMail({
            from: 'support@vestigeapp.com',
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