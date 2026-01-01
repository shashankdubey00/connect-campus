# 🚀 Deployment Guide: Render (Backend) + Vercel (Frontend)

## 📋 **PRE-DEPLOYMENT CHECKLIST**

- [ ] MongoDB Atlas database set up and accessible
- [ ] Google OAuth credentials ready (if using Google login)
- [ ] Domain names ready (optional, but recommended)
- [ ] Environment variables prepared

---

## 🔧 **PART 1: DEPLOY BACKEND TO RENDER**

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository: `connect-campus`

### Step 3: Configure Render Service

**Basic Settings:**
- **Name:** `connect-campus-backend` (or your preferred name)
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** `backend` ⚠️ **IMPORTANT: Set this to `backend`**
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** 
  - **Free tier:** Free (512 MB RAM) - Good for testing
  - **Production:** Starter ($7/month) or higher - Recommended for production

**Environment Variables:**
Add these in the Render dashboard:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_secret_key_minimum_32_characters_long
CLIENT_URL=https://your-vercel-frontend-url.vercel.app
```

**Important Notes:**
- Render uses port `10000` by default (or check your service settings)
- `CLIENT_URL` should be your Vercel frontend URL (you'll update this after deploying frontend)
- Generate a strong `JWT_SECRET` (use: `openssl rand -base64 32`)

### Step 4: Advanced Settings (Optional)

**Health Check Path:**
- **Health Check Path:** `/api/health`

**Auto-Deploy:**
- ✅ Enable "Auto-Deploy" to deploy on every push to `main`

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (usually 2-5 minutes)
4. Note your backend URL: `https://your-service-name.onrender.com`

### Step 6: Update Environment Variables

After deployment, update `CLIENT_URL` with your actual Vercel URL:
```env
CLIENT_URL=https://your-frontend.vercel.app
```

**Note:** Render will automatically redeploy when you update environment variables.

---

## ⚠️ **IMPORTANT: FILE UPLOADS ON RENDER**

**Problem:** Render's filesystem is **ephemeral** - files in `uploads/` will be **lost on restart**.

**Solutions:**

### Option 1: Use Cloud Storage (Recommended for Production)

**AWS S3:**
1. Set up AWS S3 bucket
2. Install: `npm install aws-sdk multer-s3`
3. Update multer configuration to use S3

**Cloudinary (Easier):**
1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Update multer configuration

### Option 2: Use Render Disk (Temporary Solution)

- Render provides persistent disk storage (paid plans)
- Files will persist across restarts
- **Not recommended for production** - use cloud storage instead

### Option 3: For Now (Testing Only)

- Files will work but will be lost on restart
- Good for initial testing
- **Must migrate to cloud storage before production**

---

## 🎨 **PART 2: DEPLOY FRONTEND TO VERCEL**

### Step 1: Prepare Frontend Build

1. **Test build locally:**
   ```bash
   cd frontend
   npm run build
   ```
   This should create a `dist/` folder without errors.

### Step 2: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `connect-campus`

### Step 3: Configure Vercel Project

**Project Settings:**
- **Framework Preset:** Vite
- **Root Directory:** `frontend` ⚠️ **IMPORTANT: Set this to `frontend`**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**Environment Variables:**
Add these in Vercel dashboard:

```env
VITE_BACKEND_URL=https://your-render-backend-url.onrender.com
```

**Important:**
- Replace `your-render-backend-url.onrender.com` with your actual Render backend URL
- Vercel environment variables starting with `VITE_` are exposed to the frontend

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Wait for deployment (usually 1-3 minutes)
4. You'll get a URL like: `https://connect-campus.vercel.app`

### Step 5: Update Backend CORS

1. Go back to Render dashboard
2. Update `CLIENT_URL` environment variable:
   ```env
   CLIENT_URL=https://your-vercel-url.vercel.app
   ```
3. Render will automatically redeploy

### Step 6: Custom Domain (Optional)

**Vercel:**
1. Go to your project settings
2. Click **"Domains"**
3. Add your custom domain
4. Follow DNS configuration instructions

**Render:**
1. Go to your service settings
2. Click **"Custom Domains"**
3. Add your custom domain
4. Update `CLIENT_URL` with your custom domain

---

## 🔄 **UPDATING ENVIRONMENT VARIABLES**

### Render (Backend)
1. Go to your service dashboard
2. Click **"Environment"** tab
3. Add/Edit variables
4. Click **"Save Changes"** (auto-redeploys)

### Vercel (Frontend)
1. Go to your project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add/Edit variables
4. **Important:** After adding variables, trigger a new deployment:
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment

---

## 🧪 **POST-DEPLOYMENT TESTING**

### 1. Test Backend Health
```bash
curl https://your-backend.onrender.com/api/health
```
Should return: `{"status":"OK","message":"Server is running"}`

### 2. Test Frontend
- Visit your Vercel URL
- Check browser console for errors
- Verify API calls are going to Render backend

### 3. Test Critical Features
- [ ] User registration
- [ ] Login (email and Google OAuth)
- [ ] College search
- [ ] Sending messages
- [ ] Real-time messaging (Socket.IO)
- [ ] Profile picture upload (if using cloud storage)
- [ ] Group creation
- [ ] Privacy settings

---

## 🐛 **TROUBLESHOOTING**

### Backend Issues

**Problem: Build fails**
- Check Render build logs
- Ensure `backend/package.json` has correct `start` script
- Verify Node.js version compatibility

**Problem: Server crashes**
- Check Render logs
- Verify all environment variables are set
- Check MongoDB connection string

**Problem: Socket.IO not working**
- Render supports WebSockets on paid plans
- Free tier may have limitations
- Check Render service type (Web Service, not Static Site)

**Problem: CORS errors**
- Verify `CLIENT_URL` matches your Vercel URL exactly
- Include `https://` protocol
- No trailing slash

### Frontend Issues

**Problem: Build fails**
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

**Problem: API calls fail**
- Verify `VITE_BACKEND_URL` is set correctly
- Check browser console for CORS errors
- Verify backend is running

**Problem: Environment variables not working**
- Vercel requires redeployment after adding env vars
- Ensure variables start with `VITE_` for frontend
- Check variable names match exactly

---

## 📊 **MONITORING**

### Render
- **Logs:** Available in dashboard
- **Metrics:** CPU, Memory, Network
- **Alerts:** Set up email alerts for crashes

### Vercel
- **Analytics:** Enable in project settings
- **Logs:** Available in deployment details
- **Performance:** Built-in performance monitoring

---

## 🔒 **SECURITY CHECKLIST**

- [ ] `JWT_SECRET` is strong (32+ characters, random)
- [ ] MongoDB URI includes authentication
- [ ] `CLIENT_URL` matches your frontend domain exactly
- [ ] HTTPS enabled (automatic on both platforms)
- [ ] CORS configured correctly
- [ ] No sensitive data in frontend code
- [ ] Environment variables not committed to Git

---

## 💰 **COST ESTIMATE**

### Free Tier (Testing)
- **Render:** Free (with limitations)
- **Vercel:** Free (generous limits)
- **Total:** $0/month

### Production (Recommended)
- **Render:** $7/month (Starter plan)
- **Vercel:** Free (or Pro $20/month for more features)
- **MongoDB Atlas:** Free tier available
- **Total:** ~$7-27/month

---

## ✅ **DEPLOYMENT CHECKLIST**

### Before Deployment
- [ ] Code pushed to GitHub
- [ ] Environment variables prepared
- [ ] MongoDB Atlas accessible
- [ ] Local build tested

### Backend (Render)
- [ ] Service created
- [ ] Root directory set to `backend`
- [ ] Environment variables added
- [ ] Deployed successfully
- [ ] Health check working

### Frontend (Vercel)
- [ ] Project created
- [ ] Root directory set to `frontend`
- [ ] Environment variables added
- [ ] Deployed successfully
- [ ] Frontend loads correctly

### After Deployment
- [ ] Backend CORS updated with frontend URL
- [ ] Frontend `VITE_BACKEND_URL` updated
- [ ] All features tested
- [ ] Custom domains configured (if applicable)
- [ ] Monitoring set up

---

## 🎉 **YOU'RE READY!**

Your application should now be live! 

**Next Steps:**
1. Test all features thoroughly
2. Set up file uploads with cloud storage (if not done)
3. Configure custom domains
4. Set up monitoring and alerts
5. Share your app with users!

**Need Help?**
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Check deployment logs for errors

Good luck! 🚀

