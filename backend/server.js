import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import chatRoutes from './src/routes/messageRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import videoRoutes from './src/routes/videoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { startEmailQueue } from './src/services/emailService.js';

dotenv.config();
startEmailQueue();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Before your route definitions
const allowedOrigins = [
  'https://gleeful-starburst-18884e.netlify.app',
  'http://localhost:3000'
];


// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Add headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});


app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts/videos', videoRoutes);

app.options('*', cors());

app.post('/api/test-email', async (req, res) => {
  try {
    await queueEmail({
      to: "test@example.com",
      templateId: 'verification',
      templateData: '123456',
      priority: 1
    });
    res.json({ message: 'Test email queued successfully' });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 5001;

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: 'admin',
    maxPoolSize: 10
  });
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('MongoDB connection error:', error);
}

export default app;