import dotenv from 'dotenv';
import aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import nodemailer from 'nodemailer';

dotenv.config();

const testEmail = async () => {
  try {
    console.log('Testing SES configuration...');
    console.log('AWS Region:', process.env.AWS_REGION);
    console.log('From Email:', process.env.EMAIL_FROM);
    
    // Create SES client
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: process.env.AWS_REGION,
      credentials: defaultProvider(),
      logger: console
    });

    // Test SES connection by getting send quota
    console.log('\nChecking SES quota...');
    const quota = await ses.getSendQuota({});
    console.log('SES Quota:', quota);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      SES: { ses, aws },
      debug: true,
      logger: true
    });

    // Test email address (replace with your verified email)
    const testEmailAddress = process.env.EMAIL_FROM;

    console.log('\nSending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testEmailAddress,
      subject: 'SES Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email to verify SES configuration.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('Test email sent successfully:', result);
  } catch (error) {
    console.error('Error testing email:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
  }
};

testEmail().catch(console.error);
