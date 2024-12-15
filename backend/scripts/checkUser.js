import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function checkUser(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('No user found with email:', email);
      return;
    }
    
    console.log('User details:', {
      id: user._id,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      isAdmin: user.isAdmin,
      firstLogin: user.firstLogin,
      onboardingComplete: user.onboardingComplete
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

checkUser(email);
