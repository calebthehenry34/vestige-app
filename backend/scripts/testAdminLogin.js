// backend/scripts/testAdminLogin.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testAdminLogin = async () => {
  try {
    console.log('Testing admin login...');
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@vestige.com',
        password: 'adminpassword'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    console.log('Login successful!');
    console.log('User data:', {
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      isAdmin: data.user.isAdmin
    });
    console.log('Token received:', data.token ? 'Yes' : 'No');

  } catch (error) {
    console.error('Error testing admin login:', error.message);
  }
};

testAdminLogin();
