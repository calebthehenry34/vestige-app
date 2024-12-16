import nodemailer from 'nodemailer';
import aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import EmailQueue from '../models/EmailQueue.js';
import { templates } from './emailTemplates.js';
import crypto from 'crypto';

// Create a test account if AWS credentials are not available
const createTestAccount = async () => {
  console.log('Creating test email account...');
  const testAccount = await nodemailer.createTestAccount();
  console.log('Test email account created:', testAccount);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    debug: true,
    logger: true
  });
};

// Create transporter based on environment
const createTransporter = async () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
    console.log('Using AWS SES for email...');
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: process.env.AWS_REGION,
      credentials: defaultProvider(),
      logger: console
    });

    return nodemailer.createTransport({
      SES: { ses, aws },
      sendingRate: 1,
      debug: true,
      logger: true
    });
  } else {
    console.log('AWS credentials not found, using test email account...');
    return await createTestAccount();
  }
};

// Initialize transporter
let transporter;
createTransporter().then(t => {
  transporter = t;
  console.log('Email transporter created successfully');
}).catch(console.error);

// Generate tracking pixel
const generateTrackingPixel = (trackingId) => `
  <img src="${process.env.FRONTEND_URL}/api/email/track/${trackingId}" style="width:1px;height:1px;" />
`;

// Add email to queue
export const queueEmail = async ({ to, templateId, templateData, priority = 0, scheduledFor = new Date() }) => {
  try {
    console.log(`Queueing email to ${to} with template ${templateId}`, { templateData });
    
    const trackingId = crypto.randomUUID();
    const template = templates[templateId];
    
    if (!template) {
      throw new Error('Invalid template ID');
    }

    const { subject, html } = template.template(templateData);
    const trackingPixel = generateTrackingPixel(trackingId);
    
    const email = new EmailQueue({
      to,
      from: process.env.EMAIL_FROM || 'noreply@vestige.com',
      subject,
      html: html.replace('#{trackingId}', trackingId) + trackingPixel,
      templateId,
      templateData,
      priority,
      scheduledFor,
      trackingId
    });

    await email.save();
    console.log(`Email queued successfully: ${email._id}`);
    
    // Trigger immediate processing for high-priority emails
    if (priority > 0) {
      processEmailQueue();
    }
    
    return email;
  } catch (error) {
    console.error('Error queuing email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, code) => {
  try {
    console.log(`Attempting to send verification email to ${email}`);
    
    if (!transporter) {
      console.log('Waiting for transporter initialization...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!transporter) {
        throw new Error('Email transporter not initialized');
      }
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@vestige.com',
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
    
    console.log('Email sent successfully:', result);
    // If using ethereal email, log the preview URL
    if (result.messageId && transporter.options.host === 'smtp.ethereal.email') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
    }
    return result;
  } catch (error) {
    console.error('Detailed error sending email:', {
      error: error.message,
      stack: error.stack,
      responseCode: error.responseCode,
      response: error.response
    });
    throw error;
  }
};
  
// Process email queue
export const processEmailQueue = async () => {
  try {
    if (!transporter) {
      console.log('Email transporter not initialized, skipping queue processing');
      return;
    }

    console.log('Processing email queue...');
    
    const emails = await EmailQueue.find({
      status: 'queued',
      scheduledFor: { $lte: new Date() },
      attempts: { $lt: 3 }
    }).sort({ priority: -1, scheduledFor: 1 }).limit(10);

    console.log(`Found ${emails.length} emails to process`);

    for (const email of emails) {
      try {
        console.log(`Processing email ${email._id} to ${email.to}`);
        
        email.status = 'processing';
        email.attempts += 1;
        await email.save();

        const result = await transporter.sendMail({
          from: email.from,
          to: email.to,
          subject: email.subject,
          html: email.html
        });

        console.log(`Email ${email._id} sent successfully:`, result);
        // If using ethereal email, log the preview URL
        if (result.messageId && transporter.options.host === 'smtp.ethereal.email') {
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
        }

        email.status = 'sent';
        email.sentAt = new Date();
        await email.save();
      } catch (error) {
        console.error(`Error processing email ${email._id}:`, {
          error: error.message,
          stack: error.stack,
          responseCode: error.responseCode,
          response: error.response
        });
        
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
  console.log('Starting email queue processor...');
  setInterval(processEmailQueue, 30000); // Process every 30 seconds
  // Initial process
  processEmailQueue();
};

// Export queue starter
export { startEmailQueue };
