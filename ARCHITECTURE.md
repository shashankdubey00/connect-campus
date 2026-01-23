# Connect Campus - Architecture Documentation

This document provides a comprehensive overview of the Connect Campus architecture, design decisions, and system components.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Real-time Communication](#real-time-communication)
- [Security Architecture](#security-architecture)
- [Performance Optimizations](#performance-optimizations)
- [Deployment Architecture](#deployment-architecture)

## 🎯 System Overview

Connect Campus is a full-stack web application that enables students to connect with their college communities through real-time messaging, college profiles, and social features.

### Core Features

- **Authentication**: Email/password and Google OAuth
- **College Search**: Real-time search with filters
- **Messaging**: Group chat (college-based) and direct messaging
- **User Profiles**: Student and college profiles
- **Real-time Updates**: Socket.IO for live messaging

## 🛠 Technology Stack

### Backend

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **ORM**: Mongoose
- **Authentication**: Passport.js, JWT
- **Real-time**: Socket.IO
- **File Upload**: Multer

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: CSS3 (no framework)
- **State Management**: React Context API

## 🏗 Architecture Patterns

### Backend Patterns

1. **MVC (Model-View-Controller)**
   - Models: Mongoose schemas (`backend/src/models/`)
   - Controllers: Business logic (`backend/src/controllers/`)
   - Routes: API endpoints (`backend/src/routes/`)

2. **Middleware Pattern**
   - Authentication middleware
   - Rate limiting
   - Error handling
   - Request validation

3. **Service Layer** (implicit)
   - Controllers act as service layer
   - Utilities for reusable logic

### Frontend Patterns

1. **Component-Based Architecture**
   - Reusable components
   - Page-level components
   - Container/Presentational pattern

2. **Service Layer**
   - API calls abstracted in `services/`
   - Centralized error handling

3. **Context API**
   - Theme management
   - Global state (if needed)

## 🔧 Backend Architecture

### Directory Structure

```
backend/
├── config/              # Database connection
├── src/
│   ├── config/          # Passport, environment
│   ├── controllers/     # Business logic
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # Route definitions
│   ├── socket/          # Socket.IO handlers
│   └── utils/           # Helper functions
├── routes/              # Legacy routes
└── index.js            # Server entry point
```

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, compression, body parser)
    ↓
Route Handler
    ↓
Middleware (auth, rate limit)
    ↓
Controller (business logic)
    ↓
Model (database operations)
    ↓
Response
```

### Key Components

#### Controllers

- **authController.js**: Authentication logic
- **profileController.js**: User/college profile management
- **directMessageController.js**: Direct messaging
- **messageRoutes.js**: Group messaging (via routes)

#### Middleware

- **authMiddleware.js**: JWT verification
- **rateLimiter.js**: Rate limiting
- **socketAuth.js**: Socket.IO authentication

#### Models

- **User.js**: User accounts
- **UserProfile.js**: Extended user profile
- **Message.js**: Group messages
- **DirectMessage.js**: Direct messages
- **College.js**: College data (legacy location)

## 🎨 Frontend Architecture

### Directory Structure

```
frontend/src/
├── components/          # Reusable components
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   └── ...
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Chat.jsx
│   └── ...
├── services/           # API services
│   ├── api.js         # Base API client
│   ├── authService.js
│   └── ...
├── contexts/          # React contexts
└── App.jsx           # Root component
```

### Component Hierarchy

```
App
├── ThemeProvider
└── BrowserRouter
    └── Routes
        ├── Home (with Navbar, Hero, etc.)
        ├── Chat (complex component)
        ├── Login
        └── ...
```

### State Management

- **Local State**: `useState` for component-specific data
- **Context**: Theme, global settings
- **URL State**: React Router for navigation state
- **Server State**: Fetched via API services

## 🗄 Database Design

### Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, optional),
  googleId: String (optional),
  hasPassword: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### UserProfiles Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  displayName: String,
  college: String (aisheCode),
  profilePicture: String (URL),
  bio: String,
  verified: Boolean,
  // ... other fields
}
```

#### Messages Collection
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  senderName: String,
  collegeId: String,
  text: String,
  timestamp: Date,
  readBy: [{
    userId: ObjectId,
    readAt: Date
  }],
  deliveredTo: [{
    userId: ObjectId,
    deliveredAt: Date
  }]
}
```

#### Indexes

- **Messages**: `{ collegeId: 1, timestamp: 1 }` (compound)
- **Users**: `{ email: 1 }` (unique)
- **UserProfiles**: `{ userId: 1 }` (unique)

### Data Relationships

- User → UserProfile (1:1)
- User → Messages (1:many)
- College → Messages (1:many)
- User → DirectMessages (many:many)

## 🌐 API Design

### RESTful Principles

- **GET**: Retrieve resources
- **POST**: Create resources
- **PUT**: Update resources
- **DELETE**: Delete resources

### Endpoint Structure

```
/api/{resource}/{action?}
```

Examples:
- `GET /api/colleges/search` - Search colleges
- `POST /api/auth/signup` - User registration
- `GET /api/messages/college/:collegeId` - Get messages

### Response Format

```javascript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  message: "Error message",
  error: "Detailed error" // dev only
}
```

### Authentication

- **JWT Tokens**: Stored in HTTP-only cookies
- **Session Management**: Stateless (JWT-based)
- **OAuth**: Google OAuth 2.0

## 🔌 Real-time Communication

### Socket.IO Architecture

```
Client
  ↓ (connect with JWT)
Server (Socket.IO)
  ↓ (authenticate)
Room Management
  ↓
Event Handlers
```

### Events

**Client → Server:**
- `join-room`: Join college chat room
- `send-message`: Send message
- `typing`: Typing indicator
- `mark-read`: Mark message as read

**Server → Client:**
- `message`: New message received
- `user-typing`: User typing indicator
- `user-online`: User online status
- `message-read`: Message read receipt

### Room Structure

- **College Rooms**: `college:${collegeId}`
- **User Rooms**: `user:${userId}` (for notifications)

## 🔒 Security Architecture

### Authentication Flow

1. User submits credentials
2. Server validates and creates JWT
3. JWT stored in HTTP-only cookie
4. Subsequent requests include cookie
5. Middleware verifies JWT

### Security Measures

1. **Password Security**
   - Bcrypt hashing (10 rounds)
   - Password strength validation

2. **JWT Security**
   - HTTP-only cookies (XSS protection)
   - Secure flag (HTTPS only)
   - Short expiration times

3. **Rate Limiting**
   - Per-route rate limits
   - Prevents brute force attacks

4. **Input Validation**
   - Server-side validation
   - Sanitization
   - SQL injection prevention (NoSQL)

5. **CORS**
   - Whitelisted origins
   - Credentials support

## ⚡ Performance Optimizations

### Backend

1. **Database**
   - Indexes on frequently queried fields
   - Connection pooling (50 max connections)
   - Query optimization (aggregation, lean queries)

2. **Caching**
   - In-memory cache for states/districts (5 min TTL)
   - Response compression

3. **Code**
   - Removed excessive logging
   - Optimized N+1 queries

### Frontend

1. **Code Splitting**
   - Route-based splitting (React Router)
   - Lazy loading

2. **Optimization**
   - Debounced search (300ms)
   - Memoization where needed
   - Optimistic UI updates

3. **Network**
   - Request batching
   - Parallel API calls

## 🚀 Deployment Architecture

### Recommended Setup

```
┌─────────────┐
│   CDN/      │
│  Frontend   │
└──────┬──────┘
       │
┌──────▼──────┐
│   Load     │
│  Balancer  │
└──────┬──────┘
       │
┌──────▼──────┐      ┌──────────────┐
│   Node.js   │◄────►│   MongoDB    │
│   Server    │      │    Atlas     │
└─────────────┘      └──────────────┘
```

### Environment Variables

- **Development**: `.env` files
- **Production**: Environment-specific configs
- **Secrets**: Never commit to git

### Scaling Considerations

1. **Horizontal Scaling**
   - Multiple Node.js instances
   - Load balancer
   - Session affinity for Socket.IO

2. **Database Scaling**
   - MongoDB Atlas auto-scaling
   - Read replicas
   - Sharding (if needed)

3. **Caching Layer**
   - Redis for session storage
   - CDN for static assets

## 📊 Monitoring & Logging

### Logging Strategy

- **Development**: Console logging
- **Production**: Structured logging (JSON)
- **Error Tracking**: Centralized error logs

### Metrics to Monitor

- API response times
- Database query performance
- Socket.IO connection count
- Error rates
- User activity

## 🔄 Future Considerations

1. **Microservices**: Split into services if needed
2. **Message Queue**: For async operations
3. **Caching Layer**: Redis for frequently accessed data
4. **Search**: Elasticsearch for advanced search
5. **File Storage**: S3/Cloud Storage for uploads

---

**Last Updated**: 2024
**Maintained By**: Connect Campus Team














