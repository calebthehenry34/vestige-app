import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import postRoutes from './routes/postRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import chatRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { startEmailQueue } from './services/emailService.js';

dotenv.config();
startEmailQueue();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://your-netlify-app.netlify.app' // Add your Netlify URL when ready
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,
  lastModified: true
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes); // New upload routes
app.use('/api/messages', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts/videos', videoRoutes);

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler with improved error responses
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Clean up any uploaded files if there's an error
  if (req.file) {
    fs.unlink(req.file.path, (unlinkError) => {
      if (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    });
  }

  // Send appropriate error response
  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 3000;

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('MongoDB connection error:', error);
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

export default app;
