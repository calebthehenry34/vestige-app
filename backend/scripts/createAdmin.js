// backend/scripts/createAdmin.js
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/instagram-clone');
    
    // First, check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Deleting existing admin...');
      await User.deleteOne({ email: 'admin@example.com' });
    }

    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isAdmin: true  // Explicitly set to true
    });

    await admin.save();
    
    // Verify the admin was created with correct flag
    const savedAdmin = await User.findOne({ email: 'admin@example.com' });
    console.log('Admin user created with details:', {
      email: savedAdmin.email,
      isAdmin: savedAdmin.isAdmin,
      id: savedAdmin._id
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();