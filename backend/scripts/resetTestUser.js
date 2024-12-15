import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function resetTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Delete existing test user if exists
    await User.deleteOne({ email: 'test@test.com' });
    console.log('Deleted existing test user');

    // Create new test user - don't hash password, let the model's pre-save middleware do it
    const user = new User({
      email: 'test@test.com',
      username: 'testuser',
      password: 'Test123!', // Plain password - will be hashed by pre-save middleware
      firstLogin: false,
      onboardingComplete: true
    });

    await user.save();
    console.log('Created new test user');
    
    // Verify password using the model's comparePassword method
    const savedUser = await User.findOne({ email: 'test@test.com' });
    const isMatch = await savedUser.comparePassword('Test123!');
    
    console.log('Password verification test:', {
      plainPassword: 'Test123!',
      hashedPassword: savedUser.password,
      passwordLength: savedUser.password.length,
      passwordMatches: isMatch
    });

    // Double check with direct bcrypt compare
    const bcryptMatch = await bcrypt.compare('Test123!', savedUser.password);
    console.log('Direct bcrypt comparison:', bcryptMatch);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

resetTestUser();
