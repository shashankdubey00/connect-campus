# 🔧 Render Environment Variables Checklist

## ✅ **BEFORE Manual Deploy - Check These Variables**

### **REQUIRED Variables (Must Be Set):**

1. **MONGODB_URI**
   - ✅ Should be set to your MongoDB Atlas connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/...`

2. **JWT_SECRET**
   - ✅ Should be set (at least 32 characters)
   - Should NOT be "your-secret-key" or "secret"

3. **CLIENT_URL**
   - ✅ Should be your Vercel production URL
   - Example: `https://connect-campus-ashen.vercel.app`
   - Or your main Vercel domain

4. **NODE_ENV**
   - ✅ Should be `production`

5. **GOOGLE_CLIENT_ID**
   - ✅ Your Google OAuth Client ID

6. **GOOGLE_CLIENT_SECRET**
   - ✅ Your Google OAuth Client Secret

7. **GOOGLE_CALLBACK_URL**
   - ✅ Should be: `https://connect-campus-l663.onrender.com/api/auth/google/callback`
   - ⚠️ Make sure it matches your Render URL exactly

### **OPTIONAL Variables (Email Service):**

8. **EMAIL_SERVICE** (optional)
   - Example: `gmail`

9. **EMAIL_USER** (optional)
   - Your email address

10. **EMAIL_PASSWORD** (optional)
    - App password for email

11. **EMAIL_FROM** (optional)
    - From email address

---

## ❌ **MUST BE REMOVED:**

### **PORT**
- ❌ **DO NOT SET** `PORT` environment variable
- ❌ **REMOVE IT** if it exists
- ✅ Render will auto-assign port (usually 10000)
- ✅ The code will use `process.env.PORT || 5000`, but Render sets it automatically

---

## 📋 **Quick Verification Steps:**

1. **Go to Render Dashboard** → Your Service → Environment
2. **Check each variable above** - make sure they're all set correctly
3. **VERIFY PORT is NOT SET** (remove it if it exists)
4. **VERIFY GOOGLE_CALLBACK_URL** matches your Render URL exactly
5. **VERIFY CLIENT_URL** matches your Vercel production URL

---

## 🎯 **Most Important Checks:**

### ✅ **PORT**
- Status: Should be **REMOVED/NOT SET**
- Why: Render auto-assigns port, setting PORT=5000 causes conflicts

### ✅ **GOOGLE_CALLBACK_URL**
- Should be: `https://connect-campus-l663.onrender.com/api/auth/google/callback`
- Must match exactly (including `/api/auth/google/callback`)

### ✅ **CLIENT_URL**
- Should be your Vercel production URL
- Example: `https://connect-campus-ashen.vercel.app`

---

## 🚀 **After Setting Variables:**

1. Click **"Save Changes"** in Render
2. Click **"Manual Deploy"** → **"Clear build cache & deploy"**
3. Wait 2-3 minutes
4. Check logs for version `3.0.0-step-by-step-verification`

---

## ⚠️ **Common Mistakes:**

1. ❌ Setting `PORT=5000` (causes port conflicts)
2. ❌ Wrong `GOOGLE_CALLBACK_URL` (missing `/api/auth/google/callback`)
3. ❌ Wrong `CLIENT_URL` (using localhost instead of Vercel URL)
4. ❌ Missing `/api` prefix in callback URL

---

**Last Updated**: Before manual deploy with cache clear


