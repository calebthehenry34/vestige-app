import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { queueEmail } from '../src/services/emailService.js';

dotenv.config();

const testVerificationEmail = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const testCode = '123456';
    console.log('Sending test verification email...');
    
    await queueEmail({
      to: 'calebthehenry@gmail.com',
      templateId: 'verification',
      templateData: {
        code: testCode,
        ipAddress: '127.0.0.1'
      },
      priority: 1
    });

    console.log('Test verification email queued successfully');
    
    // Wait a bit to let the queue processor run
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testVerificationEmail().catch(console.error);
