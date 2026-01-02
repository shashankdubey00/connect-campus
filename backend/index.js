// ============================================
// 🎯 STAGE 1: ENVIRONMENT & IMPORTS
// ============================================
console.log("=".repeat(60));
console.log("🚀 SERVER STARTUP - STAGE 1: Loading Environment & Imports");
console.log("=".repeat(60));

import './src/config/env.js'; // MUST be first - validates environment variables
console.log("✅ STAGE 1.1: Environment variables loaded");

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
console.log("✅ STAGE 1.2: Core dependencies imported");

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
console.log("✅ STAGE 1.3: Application modules imported");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ============================================
// 🎯 STAGE 2: PORT DETECTION
// ============================================
console.log("=".repeat(60));
console.log("🚀 SERVER STARTUP - STAGE 2: Port Configuration");
console.log("=".repeat(60));
console.log(`📌 process.env.PORT: ${process.env.PORT || 'NOT SET (will use default)'}`);
console.log(`📌 Final PORT value: ${PORT}`);
console.log(`📌 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📌 CLIENT_URL: ${process.env.CLIENT_URL || 'NOT SET'}`);
console.log(`✅ STAGE 2: Port configuration complete`);

// ============================================
// 🎯 STAGE 3: MIDDLEWARE SETUP
// ============================================
console.log("=".repeat(60));
console.log("🚀 SERVER STARTUP - STAGE 3: Setting Up Middleware");
console.log("=".repeat(60));

// Compression middleware (should be early in the middleware stack)
app.use(compression());
console.log("✅ STAGE 3.1: Compression middleware added");

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
console.log("✅ STAGE 3.2: Security headers middleware added");

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log("✅ STAGE 3.3: Body parsing middleware added");

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
console.log("✅ STAGE 3.4: Cookie parser middleware added");
app.use(passport.initialize());
console.log("✅ STAGE 3.5: Passport initialized");

// Create uploads directories if they don't exist
const collegeIdsDir = path.join(process.cwd(), 'uploads', 'college-ids');
const profilePicturesDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
if (!fs.existsSync(collegeIdsDir)) {
  fs.mkdirSync(collegeIdsDir, { recursive: true });
}
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}
console.log("✅ STAGE 3.6: Upload directories checked/created");

// Serve uploaded files
app.use('/uploads', express.static('uploads'));
console.log("✅ STAGE 3.7: Static file serving configured");
console.log(`✅ STAGE 3: All middleware setup complete`);

// Request logging middleware - MUST be before routes to catch all requests
app.use((req, res, next) => {
  console.log(`📥 INCOMING REQUEST: ${req.method} ${req.originalUrl}`);
  console.log(`📥 Request path: ${req.path}, Base URL: ${req.baseUrl}`);
  next();
});
console.log("✅ STAGE 3.8: Request logging middleware added");

// ============================================
// 🎯 STAGE 4: ROUTE REGISTRATION
// ============================================
console.log("=".repeat(60));
console.log("🚀 SERVER STARTUP - STAGE 4: Registering Routes");
console.log("=".repeat(60));
console.log("🟢 authRoutes type:", typeof authRoutes);
console.log("🟢 authRoutes has stack:", !!authRoutes?.stack);
console.log("🟢 authRoutes stack length:", authRoutes?.stack?.length || 'unknown');

app.use('/api/colleges', collegeRoutes);
console.log("✅ STAGE 4.1: /api/colleges route mounted");

app.use('/api/auth', authRoutes);
console.log("✅ STAGE 4.2: /api/auth route mounted");
console.log("🟢 authRoutes router stack after mount:", authRoutes?.stack?.length || 'unknown');

app.use('/api/messages', messageRoutes);
console.log("✅ STAGE 4.3: /api/messages route mounted");

app.use('/api/profile', profileRoutes);
console.log("✅ STAGE 4.4: /api/profile route mounted");

app.use('/api/direct-messages', directMessageRoutes);
console.log("✅ STAGE 4.5: /api/direct-messages route mounted");

app.use('/api/invites', inviteRoutes);
console.log("✅ STAGE 4.6: /api/invites route mounted");

app.use('/api/groups', groupRoutes);
console.log("✅ STAGE 4.7: /api/groups route mounted");

app.use('/auth', authRoutes); // Also support /auth routes for OAuth
console.log("✅ STAGE 4.8: /auth route mounted");

// Health check - MUST be before 404 handler
app.get('/api/health', (req, res) => {
  console.log("🟢 /api/health route HIT - SUCCESS");
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '3.0.0-step-by-step-verification',
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});
console.log("✅ STAGE 4.9: /api/health route registered");

// Debug route to verify auth routes are working
app.get('/api/auth/test', (req, res) => {
  console.log("🟢 /api/auth/test route HIT - SUCCESS");
  res.json({ 
    status: 'OK', 
    message: 'AUTH ROUTES WORKING',
    timestamp: new Date().toISOString()
  });
});
console.log("✅ STAGE 4.10: /api/auth/test route registered");

// List all registered routes for debugging
const registeredRoutes = [];
app._router?.stack?.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    registeredRoutes.push(`${methods} ${layer.route.path}`);
  } else if (layer.name === 'router') {
    // This is a mounted router
    layer.handle?.stack?.forEach((sublayer) => {
      if (sublayer.route) {
        const methods = Object.keys(sublayer.route.methods).join(',').toUpperCase();
        registeredRoutes.push(`${methods} ${layer.regexp.source}${sublayer.route.path}`);
      }
    });
  }
});

console.log("✅ STAGE 4: All routes registered");
console.log(`📋 Total middleware layers: ${app._router?.stack?.length || 'unknown'}`);
console.log(`📋 Registered API routes count: ${registeredRoutes.length}`);
if (registeredRoutes.length > 0 && registeredRoutes.length <= 20) {
  console.log("📋 Registered routes:", registeredRoutes.slice(0, 10).join(', '));
}

// ============================================
// 🎯 STAGE 5: DATABASE CONNECTION & SERVER START
// ============================================
console.log("=".repeat(60));
console.log("🚀 SERVER STARTUP - STAGE 5: Database Connection & Server Start");
console.log("=".repeat(60));

// Connect to MongoDB and start server
const startServer = async () => {
  console.log("🟡 STAGE 5.1: Connecting to MongoDB...");
  try {
    // Wait for MongoDB connection before starting server
    await connectDB();
    console.log("✅ STAGE 5.2: MongoDB connected successfully");
    console.log("🟡 STAGE 5.3: Starting HTTP server on port", PORT);
    
    // Start server only after MongoDB is connected AND all routes are registered
    server.listen(PORT, () => {
      console.log("=".repeat(60));
      console.log("✅✅✅ SERVER SUCCESSFULLY STARTED ✅✅✅");
      console.log("=".repeat(60));
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔌 Socket.IO is ready for real-time messaging`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Auth test: http://localhost:${PORT}/api/auth/test`);
      console.log(`🔗 Google OAuth: http://localhost:${PORT}/api/auth/google`);
      console.log("🟢 SERVER LISTENING - All routes should be active");
      console.log("=".repeat(60));
    });
  } catch (error) {
    console.error('❌ STAGE 5 FAILED: Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server (after all routes are registered)
console.log("🟡 STAGE 5: Calling startServer() - Routes are already registered");
startServer();

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 HANDLER TRIGGERED: ${req.method} ${req.originalUrl}`);
  console.log(`❌ Request reached 404 handler - route not found`);
  console.log(`❌ This means the request passed through all middleware but didn't match any route`);
  
  // Try to list available routes
  const availableRoutes = [];
  app._router?.stack?.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      availableRoutes.push(`${methods} ${layer.route.path}`);
    }
  });
  
  if (availableRoutes.length > 0) {
    console.log(`❌ Available direct routes (first 10):`, availableRoutes.slice(0, 10));
  }
  
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Check server logs for available routes',
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






