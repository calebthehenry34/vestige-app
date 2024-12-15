// backend/scripts/checkAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@vestige.com' });
    
    if (adminUser) {
      console.log('Admin user found:');
      console.log({
        id: adminUser._id,
        email: adminUser.email,
        username: adminUser.username,
        isAdmin: adminUser.isAdmin,
        role: adminUser.role
      });
    } else {
      console.log('No admin user found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking admin user:', error);
    process.exit(1);
  }
};

checkAdmin();
