import './src/config/env.js'; // MUST be first - validates environment variables
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import connectDB from './config/db.js';
import collegeRoutes from './routes/collegeRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
import directMessageRoutes from './src/routes/directMessageRoutes.js';
import inviteRoutes from './src/routes/inviteRoutes.js';
import groupRoutes from './src/routes/groupRoutes.js';
import passport from './src/config/passport.js';
import { initializeSocket } from './src/socket/socketServer.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Compression middleware (should be early in the middleware stack)
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - allow Vercel preview URLs (they have dynamic subdomains)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://connect-campus-ashen.vercel.app',
  'http://localhost:5173'
].filter(Boolean);

// Function to check if origin matches allowed patterns
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // Check if it's a Vercel preview URL (pattern: *.vercel.app)
  if (origin.includes('.vercel.app')) return true;
  
  // Development mode - allow all
  if (process.env.NODE_ENV !== 'production') return true;
  
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(cookieParser());
app.use(passport.initialize());

// Create uploads directories if they don't exist
const collegeIdsDir = path.join(process.cwd(), 'uploads', 'college-ids');
const profilePicturesDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
if (!fs.existsSync(collegeIdsDir)) {
  fs.mkdirSync(collegeIdsDir, { recursive: true });
}
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Request logging middleware - MUST be before routes to catch all requests
app.use((req, res, next) => {
  console.log(`📥 INCOMING REQUEST: ${req.method} ${req.originalUrl}`);
  console.log(`📥 Request path: ${req.path}, Base URL: ${req.baseUrl}`);
  next();
});

// Routes - MUST be registered before server.listen()
console.log("🟢 REGISTERING AUTH ROUTES");
console.log("🟢 authRoutes type:", typeof authRoutes);
console.log("🟢 authRoutes value:", authRoutes);

app.use('/api/colleges', collegeRoutes);
app.use('/api/auth', authRoutes);
console.log("🟢 /api/auth route mounted");
console.log("🟢 authRoutes router stack:", authRoutes?.stack?.length || 'unknown');
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/direct-messages', directMessageRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/groups', groupRoutes);
app.use('/auth', authRoutes); // Also support /auth routes for OAuth
console.log("🟢 /auth route mounted");

// Health check - MUST be before 404 handler
console.log("🟢 REGISTERING /api/health route");
app.get('/api/health', (req, res) => {
  console.log("🟢 /api/health route HIT - SUCCESS");
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '2.0.0-debug-logs',
    timestamp: new Date().toISOString()
  });
});
console.log("🟢 /api/health route registered");

// Debug route to verify auth routes are working
console.log("🟢 REGISTERING /api/auth/test route");
app.get('/api/auth/test', (req, res) => {
  console.log("🟢 /api/auth/test route HIT - SUCCESS");
  res.json({ status: 'OK', message: 'AUTH ROUTES WORKING' });
});
console.log("🟢 /api/auth/test route registered");

console.log("🟢 ALL ROUTES REGISTERED - Ready to start server");
console.log("🟢 Total middleware stack:", app._router?.stack?.length || 'unknown');

// Connect to MongoDB and start server
const startServer = async () => {
  console.log("🟡 STARTING SERVER - Connecting to MongoDB...");
  try {
    // Wait for MongoDB connection before starting server
    await connectDB();
    console.log("🟡 MongoDB connected - Starting HTTP server...");
    
    // Start server only after MongoDB is connected AND all routes are registered
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔌 Socket.IO is ready for real-time messaging`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log("🟢 SERVER LISTENING - All routes should be active");
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server (after all routes are registered)
console.log("🟡 CALLING startServer() - Routes are already registered");
startServer();

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 HANDLER TRIGGERED: ${req.method} ${req.originalUrl}`);
  console.log(`❌ Available routes:`, app._router?.stack?.map(layer => {
    if (layer.route) {
      return `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`;
    }
    return null;
  }).filter(Boolean));
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler middleware (production-ready)
app.use((err, req, res, next) => {
  // Log error with context
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment 
      ? (err.message || 'Internal server error')
      : 'An error occurred. Please try again later.',
    ...(isDevelopment && { 
      stack: err.stack,
      error: err.name 
    }),
  });
});

// Initialize Socket.IO (will be ready when server starts)
initializeSocket(server);

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
  
  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});






