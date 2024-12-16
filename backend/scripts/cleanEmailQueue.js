import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EmailQueue from '../src/models/EmailQueue.js';

dotenv.config();

const cleanEmailQueue = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete failed emails
    const result = await EmailQueue.deleteMany({ status: 'failed' });
    console.log(`Deleted ${result.deletedCount} failed emails`);

    // Reset any stuck 'processing' emails back to 'queued'
    const resetResult = await EmailQueue.updateMany(
      { status: 'processing' },
      { $set: { status: 'queued', attempts: 0 } }
    );
    console.log(`Reset ${resetResult.modifiedCount} processing emails to queued`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

cleanEmailQueue().catch(console.error);
