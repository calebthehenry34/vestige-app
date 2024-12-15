// backend/scripts/createAdmin.js
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend .env file
config({ path: join(__dirname, '..', '.env') });

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    const existingAdmin = await User.findOne({ email: 'admin@vestige.com' });
    if (existingAdmin) {
      console.log('Deleting existing admin user...');
      await User.deleteOne({ email: 'admin@vestige.com' });
      console.log('Existing admin user deleted');
    }

    // Create admin user - let the User model's pre-save middleware handle password hashing
    const adminUser = new User({
      email: 'admin@vestige.com',
      password: 'adminpassword', // This will be hashed by the pre-save middleware
      username: 'admin',
      isAdmin: true,
      onboardingComplete: true,
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully with password: adminpassword');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
