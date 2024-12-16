import nodemailer from 'nodemailer';
import aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import EmailQueue from '../models/EmailQueue.js';
import { templates } from './emailTemplates.js';
import crypto from 'crypto';

// Create SES client
const ses = new aws.SES({
  apiVersion: '2010-12-01',
  region: process.env.AWS_REGION,
  credentials: defaultProvider()
});

// Create Nodemailer transporter using SES
const transporter = nodemailer.createTransport({
  SES: { ses, aws },
  sendingRate: 1 // Limit to avoid hitting SES sending limits
});

// Generate tracking pixel
const generateTrackingPixel = (trackingId) => `
  <img src="${process.env.FRONTEND_URL}/api/email/track/${trackingId}" style="width:1px;height:1px;" />
`;

// Add email to queue
export const queueEmail = async ({ to, templateId, templateData, priority = 0, scheduledFor = new Date() }) => {
  try {
    const trackingId = crypto.randomUUID();
    const template = templates[templateId];
    
    if (!template) {
      throw new Error('Invalid template ID');
    }

    const { subject, html } = template.template(templateData);
    const trackingPixel = generateTrackingPixel(trackingId);
    
    const email = new EmailQueue({
      to,
      subject,
      html: html.replace('#{trackingId}', trackingId) + trackingPixel,
      templateId,
      templateData,
      priority,
      scheduledFor,
      trackingId
    });

    await email.save();
    return email;
  } catch (error) {
    console.error('Error queuing email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Vestige!</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px; color: #3b82f6;">${code}</h1>
          <p>This code will expire in 15 minutes.</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
  
// Process email queue
export const processEmailQueue = async () => {
  try {
    const emails = await EmailQueue.find({
      status: 'queued',
      scheduledFor: { $lte: new Date() },
      attempts: { $lt: 3 }
    }).sort({ priority: -1, scheduledFor: 1 }).limit(10);

    for (const email of emails) {
      try {
        email.status = 'processing';
        email.attempts += 1;
        await email.save();

        await transporter.sendMail({
          from: email.from || process.env.EMAIL_FROM,
          to: email.to,
          subject: email.subject,
          html: email.html
        });

        email.status = 'sent';
        email.sentAt = new Date();
        await email.save();
      } catch (error) {
        email.status = 'failed';
        email.error = error.message;
        await email.save();
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
};

// Track email opens
export const trackEmailOpen = async (trackingId, req) => {
  try {
    const email = await EmailQueue.findOne({ trackingId });
    if (email) {
      email.trackingData.opened = true;
      email.trackingData.openedAt = new Date();
      email.trackingData.ipAddress = req.ip;
      email.trackingData.userAgent = req.headers['user-agent'];
      await email.save();
    }
  } catch (error) {
    console.error('Error tracking email:', error);
  }
};

// Setup email queue processing interval
const startEmailQueue = () => {
  setInterval(processEmailQueue, 30000); // Process every 30 seconds
};

// Export queue starter
export { startEmailQueue };
