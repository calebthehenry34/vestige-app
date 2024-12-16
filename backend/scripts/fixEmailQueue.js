import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EmailQueue from '../src/models/EmailQueue.js';

dotenv.config();

const fixEmailQueue = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete failed emails
    const deleteResult = await EmailQueue.deleteMany({ status: 'failed' });
    console.log(`Deleted ${deleteResult.deletedCount} failed emails`);

    // Update FROM address for all emails
    const updateResult = await EmailQueue.updateMany(
      { from: 'support@vestigeapp.com' },
      { $set: { from: process.env.EMAIL_FROM } }
    );
    console.log(`Updated ${updateResult.modifiedCount} email FROM addresses`);

    // Reset any stuck processing emails
    const resetResult = await EmailQueue.updateMany(
      { status: 'processing' },
      { $set: { status: 'queued', attempts: 0 } }
    );
    console.log(`Reset ${resetResult.modifiedCount} processing emails`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixEmailQueue().catch(console.error);
