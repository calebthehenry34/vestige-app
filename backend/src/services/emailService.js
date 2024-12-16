import nodemailer from 'nodemailer';
import aws from '@aws-sdk/client-ses';
import EmailQueue from '../models/EmailQueue.js';
import { templates } from './emailTemplates.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a test account if AWS credentials are not available
const createTestAccount = async () => {
  try {
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
  } catch (error) {
    console.error('Error creating test account:', error);
    throw error;
  }
};

// Create transporter based on environment
const createTransporter = async () => {
  try {
    // Check if AWS credentials are available
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && 
                             process.env.AWS_SECRET_ACCESS_KEY && 
                             process.env.AWS_REGION;

    if (hasAWSCredentials) {
      try {
        console.log('Using AWS SES for email...');
        const ses = new aws.SES({
          apiVersion: '2010-12-01',
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });

        return nodemailer.createTransport({
          SES: { ses, aws }
        });
      } catch (error) {
        console.error('Error creating SES transport:', error);
        console.log('Falling back to test account...');
        return await createTestAccount();
      }
    } else {
      console.log('AWS credentials not found, using test email account...');
      return await createTestAccount();
    }
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Initialize transporter with retries
const initializeTransporter = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const t = await createTransporter();
      console.log('Email transporter created successfully');
      return t;
    } catch (error) {
      console.error(`Failed to create transporter (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Initialize transporter
let transporter;
initializeTransporter()
  .then(t => {
    transporter = t;
    console.log('Email transporter initialized with configuration:', {
      isAWS: !!t?.transporter?.options?.SES,
      region: process.env.AWS_REGION
    });
  })
  .catch(error => {
    console.error('Failed to initialize email transporter:', error);
  });

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
    
    const email = new EmailQueue({
      to,
      from: process.env.EMAIL_FROM || 'support@vestigeapp.com',
      subject,
      html,
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
      console.log('Email transporter not initialized, attempting to create...');
      transporter = await createTransporter();
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'support@vestigeapp.com',
      to: email,
      subject: "Verify your email address",
      html: templates.verification.template({
        code,
        ipAddress: 'Unknown'
      }).html
    });
    
    console.log('Email sent successfully:', result);
    if (result.messageId && transporter.options.host === 'smtp.ethereal.email') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
    }
    return result;
  } catch (error) {
    console.error('Error sending verification email:', {
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
      console.log('Email transporter not initialized, attempting to create...');
      transporter = await createTransporter();
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

// Setup email queue processing interval
const startEmailQueue = () => {
  console.log('Starting email queue processor...');
  setInterval(processEmailQueue, 30000); // Process every 30 seconds
  // Initial process
  processEmailQueue();
};

// Export queue starter
export { startEmailQueue };
