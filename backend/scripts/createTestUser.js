import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Check if test user exists
    const existingUser = await User.findOne({ email: 'test@test.com' });
    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Create test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Test123!', salt);

    const user = new User({
      email: 'test@test.com',
      username: 'testuser',
      password: hashedPassword,
      firstLogin: false,
      onboardingComplete: true
    });

    await user.save();
    console.log('Test user created successfully');
    
    // Verify the user was created
    const createdUser = await User.findOne({ email: 'test@test.com' });
    console.log('Created user details:', {
      id: createdUser._id,
      email: createdUser.email,
      username: createdUser.username,
      hasPassword: !!createdUser.password,
      passwordLength: createdUser.password?.length
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createTestUser();
