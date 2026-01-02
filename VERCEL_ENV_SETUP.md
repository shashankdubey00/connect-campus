# 🔧 Vercel Environment Variables Setup

## ⚠️ **CRITICAL: Frontend Environment Variable Missing**

The frontend needs `VITE_API_URL` set in Vercel to connect to the backend.

---

## 🎯 **Step-by-Step Fix:**

### **Step 1: Go to Vercel Dashboard**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **"Connect Campus"** project
3. Go to **Settings** → **Environment Variables**

### **Step 2: Add Environment Variable**

1. Click **"Add New"**
2. Set the following:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://connect-campus-l663.onrender.com`
   - **Environment**: Select **Production**, **Preview**, and **Development** (or just **Production** if you only want it for production)

3. Click **"Save"**

### **Step 3: Redeploy Frontend**

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (2-3 minutes)

---

## ✅ **Verify It's Working:**

After redeploy, test:

1. **Normal Login**: 
   - Go to `https://connect-campus-ashen.vercel.app/login`
   - Try logging in with email/password
   - Should work (no "Failed to fetch" error)

2. **Google OAuth**:
   - Click "Continue with Google"
   - Should redirect to Google login (not "Not Found")

3. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Should NOT see CORS errors
   - API calls should go to `https://connect-campus-l663.onrender.com`

---

## 🔍 **Current Status:**

- ✅ Backend is working: `https://connect-campus-l663.onrender.com`
- ✅ Backend version: `3.0.0-step-by-step-verification`
- ✅ Google OAuth endpoint works: `/api/auth/google` redirects correctly
- ❌ Frontend `VITE_API_URL` not set in Vercel (or set to wrong URL)

---

## 📋 **Environment Variables Checklist for Vercel:**

### **Required:**
- ✅ `VITE_API_URL` = `https://connect-campus-l663.onrender.com`

### **Optional (if you have them):**
- Other frontend-specific variables

---

## ⚠️ **Common Mistakes:**

1. ❌ Setting `VITE_API_URL` to `http://localhost:5000` (won't work in production)
2. ❌ Setting `VITE_API_URL` to `connect-campus-1663.onrender.com` (wrong URL, doesn't exist)
3. ❌ Not redeploying after adding environment variable
4. ❌ Setting it only for Development, not Production

---

## 🚀 **After Setting VITE_API_URL:**

1. ✅ Normal login should work
2. ✅ Google OAuth should work
3. ✅ All API calls should work
4. ✅ No "Failed to fetch" errors

---

**Last Updated**: After identifying frontend environment variable issue



