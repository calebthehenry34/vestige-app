import dotenv from 'dotenv';
import aws from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

dotenv.config();

const testEmail = async () => {
  try {
    console.log('Testing SES configuration...');
    console.log('AWS Region:', process.env.AWS_REGION);
    console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? '****' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'not set');
    console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? '****' : 'not set');
    console.log('From Email:', process.env.EMAIL_FROM);
    
    // Create SES client with explicit credentials
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      logger: console
    });

    // Test SES connection by getting send quota
    console.log('\nChecking SES quota...');
    try {
      const quota = await ses.getSendQuota({});
      console.log('SES Quota:', JSON.stringify(quota, null, 2));
    } catch (quotaError) {
      console.error('Error getting SES quota:', {
        message: quotaError.message,
        code: quotaError.code,
        statusCode: quotaError.statusCode,
        requestId: quotaError.requestId
      });
      throw quotaError;
    }

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

    console.log('Test email sent successfully:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing email:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      details: error
    });
    process.exit(1);
  }
};

testEmail().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
