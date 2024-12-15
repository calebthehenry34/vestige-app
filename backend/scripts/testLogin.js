import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function testLogin() {
  try {
    // First, get the user directly from the database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const user = await User.findOne({ email: 'test@test.com' });
    if (!user) {
      console.log('User not found in database');
      return;
    }

    console.log('User from DB:', {
      email: user.email,
      hashedPassword: user.password,
      passwordLength: user.password?.length
    });

    // Test password comparison directly
    const plainPassword = 'Test123!';
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    console.log('Direct password comparison result:', isMatch);

    // Now test the API endpoint
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: plainPassword
      })
    });

    const data = await response.json();
    console.log('API Status:', response.status);
    console.log('API Response:', data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testLogin();
