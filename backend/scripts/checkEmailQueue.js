import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EmailQueue from '../src/models/EmailQueue.js';

dotenv.config();

const checkEmailQueue = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Check failed emails
    const failedEmails = await EmailQueue.find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\nLast 5 Failed Emails:');
    failedEmails.forEach(email => {
      console.log(`\nTo: ${email.to}`);
      console.log(`From: ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Error: ${email.error}`);
      console.log(`Attempts: ${email.attempts}`);
      console.log(`Created At: ${email.createdAt}`);
    });

    // Check queued emails
    const queuedEmails = await EmailQueue.find({ status: 'queued' })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\nLast 5 Queued Emails:');
    queuedEmails.forEach(email => {
      console.log(`\nTo: ${email.to}`);
      console.log(`From: ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Priority: ${email.priority}`);
      console.log(`Scheduled For: ${email.scheduledFor}`);
      console.log(`Created At: ${email.createdAt}`);
    });

    // Check successful emails
    const sentEmails = await EmailQueue.find({ status: 'sent' })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\nLast 5 Sent Emails:');
    sentEmails.forEach(email => {
      console.log(`\nTo: ${email.to}`);
      console.log(`From: ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Sent At: ${email.sentAt}`);
      console.log(`Created At: ${email.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkEmailQueue().catch(console.error);
