# 🚀 Complete Deployment Guide - From Scratch

## 📋 **PRE-DEPLOYMENT CHECKLIST**

Before we start, make sure you have:
- [ ] GitHub repository with your code pushed
- [ ] MongoDB Atlas account and connection string
- [ ] Google Cloud Console account (for OAuth)
- [ ] Render account (free tier works)
- [ ] Vercel account (free tier works)

---

## 🔧 **PART 1: PREPARE YOUR CODEBASE**

### Step 1.1: Verify Your Code is Ready

1. **Check your repository is up to date:**
   ```bash
   git status
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Test local build:**
   ```bash
   # Test frontend build
   cd frontend
   npm run build
   cd ..
   
   # If build succeeds, you're good to go!
   ```

---

## 🗄️ **PART 2: SET UP MONGODB ATLAS**

### Step 2.1: Get MongoDB Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Log in to your account
3. Click on your cluster
4. Click **"Connect"**
5. Choose **"Connect your application"**
6. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
7. **Save this** - you'll need it for Render

---

## 🔐 **PART 3: SET UP GOOGLE OAUTH (FROM SCRATCH)**

### Step 3.1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. If prompted, configure OAuth consent screen first:
   - Choose **"External"** (unless you have Google Workspace)
   - Fill in required fields (App name, User support email, Developer contact)
   - Click **"Save and Continue"** through the steps
   - Add your email as a test user if needed

### Step 3.2: Create OAuth Client ID

1. Application type: **"Web application"**
2. Name: `Connect Campus` (or your app name)
3. **Authorized JavaScript origins:**
   - Add: `https://your-vercel-app.vercel.app` (we'll update this after Vercel deployment)
   - Add: `http://localhost:5173` (for local dev)
4. **Authorized redirect URIs:**
   - Add: `https://your-render-backend.onrender.com/api/auth/google/callback` (we'll update this after Render deployment)
   - Add: `http://localhost:5000/api/auth/google/callback` (for local dev)
5. Click **"Create"**
6. **Copy these values:**
   - Client ID (looks like: `383823284402-xxxxx.apps.googleusercontent.com`)
   - Client Secret (click "Show" to reveal)
   - **Save both** - you'll need them for Render

**⚠️ Note:** We'll come back to update the redirect URIs after deployment with actual URLs.

---

## 🖥️ **PART 4: DEPLOY BACKEND TO RENDER**

### Step 4.1: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `connect-campus` (or your repo name)
5. Click **"Connect"**

### Step 4.2: Configure Render Service

Fill in these settings:

**Basic Settings:**
- **Name:** `connect-campus-backend` (or your preferred name)
- **Region:** Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch:** `main`
- **Root Directory:** `backend` ⚠️ **IMPORTANT!**
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Instance Type:**
- For testing: **Free** (512 MB RAM)
- For production: **Starter** ($7/month) - Recommended

### Step 4.3: Add Environment Variables in Render

Click **"Advanced"** → **"Add Environment Variable"** and add these one by one:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=generate_a_strong_random_secret_32_chars_minimum
CLIENT_URL=https://your-vercel-app.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id_from_step_3
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_step_3
GOOGLE_CALLBACK_URL=https://connect-campus-backend.onrender.com/api/auth/google/callback
```

**Important Notes:**
- Replace `your_mongodb_atlas_connection_string_here` with your actual MongoDB URI
- For `JWT_SECRET`, generate a strong random string (32+ characters). You can use: `openssl rand -base64 32` or an online generator
- Replace `your-vercel-app` with your actual Vercel URL (we'll update this after Vercel deployment)
- Replace `connect-campus-backend` with your actual Render service name
- Replace Google credentials with values from Step 3.2

### Step 4.4: Deploy Backend

1. Scroll down and click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (2-5 minutes)
4. **Copy your backend URL:** `https://connect-campus-backend.onrender.com` (or your service name)
5. **Save this URL** - you'll need it for Vercel and Google Console

### Step 4.5: Test Backend

1. Visit: `https://your-backend.onrender.com/api/health`
2. Should return: `{"status":"OK","message":"Server is running"}`
3. If it works, backend is deployed! ✅

---

## 🎨 **PART 5: DEPLOY FRONTEND TO VERCEL**

### Step 5.1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `connect-campus`
4. Click **"Import"**

### Step 5.2: Configure Vercel Project

**Project Settings:**
- **Framework Preset:** `Vite` (should auto-detect)
- **Root Directory:** `frontend` ⚠️ **IMPORTANT!** Click "Edit" and set to `frontend`
- **Build Command:** `npm run build` (should auto-fill)
- **Output Directory:** `dist` (should auto-fill)
- **Install Command:** `npm install` (should auto-fill)

### Step 5.3: Add Environment Variables in Vercel

Before deploying, click **"Environment Variables"** and add:

```env
VITE_BACKEND_URL=https://connect-campus-backend.onrender.com
```

**Important:**
- Replace `connect-campus-backend` with your actual Render backend URL
- Make sure it starts with `https://`
- No trailing slash

### Step 5.4: Deploy Frontend

1. Click **"Deploy"**
2. Wait for build to complete (1-3 minutes)
3. **Copy your frontend URL:** `https://connect-campus-vercel.vercel.app` (or your project name)
4. **Save this URL** - you'll need it for Render and Google Console

---

## 🔄 **PART 6: UPDATE CONFIGURATIONS**

### Step 6.1: Update Render Environment Variables

1. Go back to Render dashboard
2. Go to your backend service → **Environment** tab
3. Update `CLIENT_URL`:
   ```env
   CLIENT_URL=https://your-actual-vercel-url.vercel.app
   ```
4. Update `GOOGLE_CALLBACK_URL`:
   ```env
   GOOGLE_CALLBACK_URL=https://your-actual-render-backend.onrender.com/api/auth/google/callback
   ```
5. Render will auto-redeploy (wait 1-2 minutes)

### Step 6.2: Update Google Cloud Console

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click on your OAuth Client ID
4. Update **Authorized JavaScript origins:**
   - Add: `https://your-actual-vercel-url.vercel.app`
5. Update **Authorized redirect URIs:**
   - Add: `https://your-actual-render-backend.onrender.com/api/auth/google/callback`
   - Make sure it's exactly: `https://...onrender.com/api/auth/google/callback`
   - **No typos!** Double-check `callback` is spelled correctly
6. Click **"Save"**

### Step 6.3: Update Vercel Environment Variables (if needed)

1. Go to Vercel dashboard
2. Your project → **Settings** → **Environment Variables**
3. Verify `VITE_BACKEND_URL` is correct
4. If you changed it, trigger a new deployment:
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment → **"Redeploy"**

---

## ✅ **PART 7: TEST EVERYTHING**

### Step 7.1: Test Backend Health
```bash
# Visit in browser:
https://your-backend.onrender.com/api/health
# Should return: {"status":"OK","message":"Server is running"}
```

### Step 7.2: Test Frontend
1. Visit your Vercel URL
2. Check browser console (F12) for errors
3. Verify the page loads correctly

### Step 7.3: Test Google OAuth
1. Go to your Vercel frontend
2. Click **"Login"** or **"Sign Up"**
3. Click **"Continue with Google"**
4. You should see Google OAuth consent screen
5. After authorizing, you should be redirected back and logged in
6. ✅ If this works, everything is set up correctly!

### Step 7.4: Test Other Features
- [ ] User registration (email/password)
- [ ] User login (email/password)
- [ ] College search
- [ ] Sending messages
- [ ] Real-time messaging
- [ ] Profile picture upload

---

## 🐛 **TROUBLESHOOTING**

### Backend Issues

**Problem: Build fails**
- Check Render build logs
- Verify `Root Directory` is set to `backend`
- Check `package.json` has correct `start` script

**Problem: Server crashes**
- Check Render logs
- Verify all environment variables are set
- Check MongoDB connection string is correct

**Problem: CORS errors**
- Verify `CLIENT_URL` in Render matches your Vercel URL exactly
- Include `https://` protocol
- No trailing slash

### Frontend Issues

**Problem: API calls fail**
- Verify `VITE_BACKEND_URL` in Vercel is correct
- Check browser console for errors
- Verify backend is running (check Render)

**Problem: Google OAuth fails**
- Double-check Google Console redirect URI matches exactly
- Verify `GOOGLE_CALLBACK_URL` in Render matches Google Console
- Check Render logs for OAuth errors

### Google OAuth Specific

**Error: `redirect_uri_mismatch`**
- Google Console redirect URI must match exactly
- Check for typos (especially `callback` vs `callt`)
- Must include `https://` protocol
- Must be full URL: `https://backend.onrender.com/api/auth/google/callback`

**Error: `invalid_client`**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render are correct
- Check credentials are for the correct Google Cloud project

---

## 📝 **FINAL CHECKLIST**

- [ ] MongoDB Atlas connection string ready
- [ ] Google OAuth credentials created
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set in Render
- [ ] `VITE_BACKEND_URL` set in Vercel
- [ ] Google Console redirect URIs updated with actual URLs
- [ ] Render `CLIENT_URL` updated with Vercel URL
- [ ] Render `GOOGLE_CALLBACK_URL` updated with Render URL
- [ ] Backend health check works
- [ ] Frontend loads correctly
- [ ] Google OAuth works end-to-end
- [ ] All features tested

---

## 🎉 **YOU'RE DONE!**

Your application should now be fully deployed and working!

**Need Help?**
- Check Render logs: Dashboard → Your Service → Logs
- Check Vercel logs: Dashboard → Your Project → Deployments → Click deployment → View logs
- Check browser console (F12) for frontend errors

**Next Steps:**
- Set up custom domains (optional)
- Configure file uploads with cloud storage (S3/Cloudinary)
- Set up monitoring and alerts

Good luck! 🚀




