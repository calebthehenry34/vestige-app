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

    // Create new test user
    const plainPassword = 'Test123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const user = new User({
      email: 'test@test.com',
      username: 'testuser',
      password: hashedPassword,
      firstLogin: false,
      onboardingComplete: true
    });

    await user.save();
    console.log('Created new test user');
    
    // Verify password works
    const savedUser = await User.findOne({ email: 'test@test.com' });
    const isMatch = await bcrypt.compare(plainPassword, savedUser.password);
    
    console.log('Password verification test:', {
      plainPassword,
      hashedPassword: savedUser.password,
      passwordLength: savedUser.password.length,
      passwordMatches: isMatch
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

resetTestUser();
