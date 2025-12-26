# 🔐 Complete Authentication Setup Guide

## Use This Authentication System in Any Project

This guide will help you set up the complete authentication system (Email + Password + Google OAuth) in any new project from scratch.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Environment Variables](#environment-variables)
5. [File Structure](#file-structure)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Google Cloud Console account (for OAuth)
- Basic knowledge of Express.js and React

---

## 🚀 Backend Setup

### Step 1: Initialize Backend Project

```bash
mkdir my-project-backend
cd my-project-backend
npm init -y
```

### Step 2: Install Dependencies

```bash
npm install express mongoose bcryptjs jsonwebtoken cookie-parser cors dotenv passport passport-google-oauth20
```

### Step 3: Create Backend File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── passport.js        # Google OAuth strategy
│   │   └── env.js            # Environment validation
│   ├── controllers/
│   │   └── authController.js # Auth logic
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT protection
│   │   ├── rateLimiter.js    # Rate limiting
│   │   └── csrfMiddleware.js # CSRF protection
│   ├── models/
│   │   ├── User.js           # User schema
│   │   └── UserProfile.js    # User profile schema
│   ├── routes/
│   │   └── authRoutes.js     # Auth routes
│   ├── utils/
│   │   └── emailService.js   # Email service (optional)
│   └── index.js              # Server entry point
├── .env                       # Environment variables
└── package.json
```

### Step 4: Copy Backend Files

Copy these files from the current project:

**Required Files:**

1. `backend/src/models/User.js`
2. `backend/src/models/UserProfile.js`
3. `backend/src/controllers/authController.js`
4. `backend/src/middleware/authMiddleware.js`
5. `backend/src/middleware/rateLimiter.js`
6. `backend/src/middleware/csrfMiddleware.js`
7. `backend/src/routes/authRoutes.js`
8. `backend/src/config/passport.js`
9. `backend/src/config/db.js`
10. `backend/src/config/env.js`
11. `backend/src/index.js`

**Optional Files:**

- `backend/src/utils/emailService.js` (if you need email features)

---

## 🎨 Frontend Setup

### Step 1: Initialize Frontend Project

```bash
# Using Vite (recommended)
npm create vite@latest my-project-frontend -- --template react
cd my-project-frontend
npm install
```

### Step 2: Install Frontend Dependencies

```bash
npm install react-router-dom
```

### Step 3: Create Frontend File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PasswordStrength.jsx  # Password strength meter
│   │   └── Navbar.jsx            # Navigation (optional)
│   ├── pages/
│   │   ├── Login.jsx              # Login page
│   │   ├── Signup.jsx             # Signup page
│   │   ├── ForgotPassword.jsx     # Forgot password
│   │   ├── VerifyOTP.jsx          # OTP verification
│   │   ├── ChangePassword.jsx    # Change password
│   │   └── SetPassword.jsx        # Set password (Google users)
│   ├── services/
│   │   ├── api.js                 # API request helper
│   │   └── authService.js         # Auth API calls
│   └── App.jsx                    # Main app component
├── .env                           # Environment variables
└── package.json
```

### Step 4: Copy Frontend Files

Copy these files from the current project:

**Required Files:**

1. `frontend/src/services/api.js`
2. `frontend/src/services/authService.js`
3. `frontend/src/components/PasswordStrength.jsx`
4. `frontend/src/pages/Login.jsx`
5. `frontend/src/pages/Signup.jsx`
6. `frontend/src/pages/ForgotPassword.jsx`
7. `frontend/src/pages/VerifyOTP.jsx`
8. `frontend/src/pages/ChangePassword.jsx`
9. `frontend/src/pages/SetPassword.jsx`

---

## 🔧 Environment Variables

### Backend `.env` File

Create `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/my-project
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

# Client URL (frontend URL)
CLIENT_URL=http://localhost:5173

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Email Service (optional - for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### Frontend `.env` File

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

---

## 📝 Step-by-Step Setup Instructions

### Backend Configuration

#### 1. Database Connection (`backend/src/config/db.js`)

```javascript
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
```

#### 2. Server Setup (`backend/src/index.js`)

```javascript
import "./config/env.js"; // MUST be first
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import passport from "./config/passport.js";

connectDB();

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
});
```

#### 3. Environment Validation (`backend/src/config/env.js`)

```javascript
import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];

// Check required variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate JWT_SECRET strength
if (
  process.env.NODE_ENV === "production" &&
  process.env.JWT_SECRET.length < 32
) {
  console.error("❌ JWT_SECRET must be at least 32 characters in production");
  process.exit(1);
}

console.log("✅ Environment variables validated");
```

### Frontend Configuration

#### 1. App Routes (`frontend/src/App.jsx`)

```javascript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ChangePassword from "./pages/ChangePassword";
import SetPassword from "./pages/SetPassword";
import Home from "./pages/Home"; // Your home page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/set-password" element={<SetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 🔑 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URI:
   ```
   http://localhost:5000/auth/google/callback
   ```
5. Copy **Client ID** and **Client Secret**

### Step 3: Add to Backend `.env`

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
```

---

## 🧪 Testing

### Test Backend

```bash
cd backend
npm start
```

Check:

- ✅ Server starts without errors
- ✅ MongoDB connects
- ✅ Health check: `http://localhost:5000/health`

### Test Frontend

```bash
cd frontend
npm run dev
```

Check:

- ✅ Frontend runs on `http://localhost:5173`
- ✅ Can access login/signup pages

### Test Authentication Flow

1. **Signup:**

   - Go to `/signup`
   - Create account
   - Should auto-login and redirect

2. **Login:**

   - Go to `/login`
   - Login with credentials
   - Should redirect to home

3. **Google OAuth:**

   - Click "Login with Google"
   - Should redirect to Google
   - After approval, should redirect back and login

4. **Password Reset:**
   - Go to `/forgot-password`
   - Enter email
   - Check email for OTP
   - Verify OTP and reset password

---

## 📦 Quick Copy Checklist

### Backend Files to Copy:

- [ ] `src/models/User.js`
- [ ] `src/models/UserProfile.js`
- [ ] `src/controllers/authController.js`
- [ ] `src/middleware/authMiddleware.js`
- [ ] `src/middleware/rateLimiter.js`
- [ ] `src/middleware/csrfMiddleware.js`
- [ ] `src/routes/authRoutes.js`
- [ ] `src/config/passport.js`
- [ ] `src/config/db.js`
- [ ] `src/config/env.js`
- [ ] `src/index.js` (or merge with existing)

### Frontend Files to Copy:

- [ ] `src/services/api.js`
- [ ] `src/services/authService.js`
- [ ] `src/components/PasswordStrength.jsx`
- [ ] `src/pages/Login.jsx`
- [ ] `src/pages/Signup.jsx`
- [ ] `src/pages/ForgotPassword.jsx`
- [ ] `src/pages/VerifyOTP.jsx`
- [ ] `src/pages/ChangePassword.jsx`
- [ ] `src/pages/SetPassword.jsx`

---

## 🔧 Customization

### Change Password Requirements

Edit `backend/src/controllers/authController.js`:

```javascript
// Change minimum length
const isStrongPassword = (password) => {
  return password.length >= 10; // Change this number
};
```

### Change JWT Expiration

Edit `backend/src/controllers/authController.js`:

```javascript
// In login function
const token = jwt.sign(
  { userId: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "1d" } // Change: "1d", "7d", "30d", etc.
);
```

### Add Custom User Fields

Edit `backend/src/models/User.js`:

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields ...

  // Add your custom fields
  customField: {
    type: String,
    default: "",
  },
});
```

---

## 🐛 Troubleshooting

### Issue: "MongoDB connection failed"

**Solution:**

- Check `MONGO_URI` in `.env`
- Ensure MongoDB is running
- Check network/firewall settings
- For Atlas: Add your IP to Network Access whitelist

### Issue: "JWT_SECRET missing"

**Solution:**

- Add `JWT_SECRET` to `.env`
- Must be at least 32 characters
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Issue: "Google OAuth not working"

**Solution:**

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check redirect URI matches Google Console
- Ensure Google+ API is enabled

### Issue: "CORS errors"

**Solution:**

- Check `CLIENT_URL` in backend `.env` matches frontend URL
- Verify `credentials: true` in CORS config
- Check frontend `VITE_BACKEND_URL` matches backend URL

### Issue: "CSRF token errors"

**Solution:**

- Ensure CSRF token endpoint is accessible
- Check cookies are enabled in browser
- Verify `X-CSRF-Token` header is sent

---

## 📚 Additional Resources

### Protected Routes Example

```javascript
import { protect } from "../middleware/authMiddleware.js";

router.get("/protected", protect, (req, res) => {
  // req.user contains { userId, role }
  res.json({
    message: "Access granted",
    user: req.user,
  });
});
```

### Frontend Auth Check Example

```javascript
import { verifyAuth } from "./services/authService";

useEffect(() => {
  async function checkAuth() {
    try {
      const data = await verifyAuth();
      if (data.success) {
        console.log("User:", data.user);
        // User is authenticated
      }
    } catch (error) {
      // User is not authenticated
      navigate("/login");
    }
  }
  checkAuth();
}, []);
```

---

## ✅ Final Checklist

Before going to production:

- [ ] Change `NODE_ENV=production` in backend `.env`
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Update `CLIENT_URL` to production URL
- [ ] Update Google OAuth redirect URI for production
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set up MongoDB Atlas (or secure MongoDB)
- [ ] Configure email service for production
- [ ] Remove console.logs with sensitive data
- [ ] Test all authentication flows
- [ ] Set up error monitoring

---

## 🎉 You're Done!

Your authentication system is now ready to use. All security best practices are implemented:

- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ JWT in httpOnly cookies
- ✅ Google OAuth (backend-verified)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Account lockout
- ✅ Password history
- ✅ Password strength meter

**Need help?** Check the troubleshooting section or review the code comments.

---

**Last Updated:** $(date)
