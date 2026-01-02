# 🔍 Render Deployment Issues Checklist (Non-Code)

## ⚠️ **CRITICAL RENDER CONFIGURATION ISSUES**

### 1. **Root Directory Configuration** ⚠️ MOST COMMON ISSUE

**Problem:** Render might be running from wrong directory

**Check in Render Dashboard:**
- Go to your service → **Settings** → **Build & Deploy**
- **Root Directory** MUST be: `backend`
- If it's empty or set to `/` or `.`, routes won't work

**Fix:**
```
Root Directory: backend
```

---

### 2. **Start Command** ⚠️ CRITICAL

**Problem:** Wrong start command or command not executing

**Check in Render Dashboard:**
- **Start Command** MUST be: `npm start`
- This should execute: `node index.js` (from package.json)

**Verify:**
- Go to **Settings** → **Build & Deploy**
- **Start Command:** `npm start`
- NOT: `node index.js` (might not work if root directory is wrong)
- NOT: `npm run start` (redundant)

---

### 3. **Port Configuration** ⚠️ IMPORTANT

**Problem:** Code uses PORT 5000, but Render uses PORT 10000

**Check:**
- Render automatically sets `PORT` environment variable
- Your code: `const PORT = process.env.PORT || 5000;` ✅ This is correct
- But verify Render is actually setting PORT

**Fix in Render:**
- Go to **Environment** tab
- Add/Verify: `PORT=10000` (or let Render set it automatically)
- Render should auto-set this, but verify it exists

---

### 4. **Build Command** ⚠️

**Problem:** Build might be failing silently

**Check:**
- **Build Command:** `npm install`
- Should NOT be: `npm run build` (you don't have a build script)
- Should NOT be empty

**Verify:**
- Check **Logs** tab in Render
- Look for build errors
- Should see: "npm install" output

---

### 5. **Node Version** ⚠️

**Problem:** Wrong Node.js version

**Check:**
- Render might be using an incompatible Node version
- Your code uses ES modules (`"type": "module"`)

**Fix:**
- Go to **Settings** → **Build & Deploy**
- **Node Version:** Should be `18.x` or `20.x` (not 14 or 16)
- Or add to `package.json`:
  ```json
  "engines": {
    "node": ">=18.0.0"
  }
  ```

---

### 6. **Service Sleeping (Free Tier)** ⚠️

**Problem:** Free tier services sleep after 15 minutes of inactivity

**Symptoms:**
- First request after sleep takes 30-60 seconds
- Routes might not respond immediately
- Service needs to "wake up"

**Check:**
- Look at Render dashboard - is service status "Sleeping"?
- First request after sleep will be slow

**Fix:**
- Upgrade to paid tier (Starter $7/month) - no sleeping
- Or wait 30-60 seconds for first request

---

### 7. **Deployment Not Updating** ⚠️

**Problem:** Render might be running old code

**Check:**
- Go to **Logs** tab
- Look for deployment timestamp
- Compare with your latest GitHub push

**Fix:**
- Go to **Manual Deploy** → **Clear build cache & deploy**
- Or trigger manual redeploy
- Check if auto-deploy is enabled

---

### 8. **Working Directory Issue** ⚠️

**Problem:** Code runs but can't find files due to wrong working directory

**Check:**
- If Root Directory is `backend`, working directory should be `/opt/render/project/src/backend`
- But imports use relative paths like `./src/routes/authRoutes.js`
- This should work IF Root Directory is `backend`

**Verify:**
- Add to `index.js` temporarily:
  ```js
  console.log("Current working directory:", process.cwd());
  console.log("__dirname equivalent:", import.meta.url);
  ```

---

### 9. **Environment Variables Not Loading** ⚠️

**Problem:** Env vars might not be set or loading incorrectly

**Check:**
- Go to **Environment** tab
- Verify all required vars exist:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLIENT_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CALLBACK_URL`
  - `PORT` (auto-set by Render)

**Verify in Logs:**
- Check if `env.js` validation passes
- Look for: `✅ Environment variables validated`

---

### 10. **Health Check Interfering** ⚠️

**Problem:** Health check might be hitting wrong endpoint

**Check:**
- Go to **Settings** → **Health Check Path**
- Should be: `/api/health`
- If wrong, service might be marked as unhealthy

**Fix:**
- Set **Health Check Path:** `/api/health`
- Or disable health check temporarily

---

### 11. **Multiple Service Instances** ⚠️

**Problem:** Multiple deployments or services with same name

**Check:**
- Go to Render dashboard
- Look for duplicate services
- Old service might still be running

**Fix:**
- Delete old/duplicate services
- Keep only one active service

---

### 12. **GitHub Branch/Commit** ⚠️

**Problem:** Render might be deploying wrong branch or old commit

**Check:**
- Go to **Settings** → **Build & Deploy**
- **Branch:** Should be `main`
- **Auto-Deploy:** Should be enabled

**Verify:**
- Check **Deployments** tab
- Latest deployment should match your latest GitHub commit
- Commit hash should match

---

## 🔍 **DIAGNOSTIC STEPS**

### Step 1: Check Render Logs

1. Go to Render Dashboard → Your Service → **Logs**
2. Look for:
   - `🔵 AUTH ROUTES FILE LOADED` (should appear)
   - `🟢 REGISTERING AUTH ROUTES` (should appear)
   - `🚀 Server is running on port X` (should show port)
   - Any error messages

### Step 2: Verify Configuration

1. Go to **Settings** → **Build & Deploy**
2. Verify:
   - Root Directory: `backend` ✅
   - Build Command: `npm install` ✅
   - Start Command: `npm start` ✅
   - Branch: `main` ✅

### Step 3: Check Environment Variables

1. Go to **Environment** tab
2. Verify all required vars are set
3. Check for typos or missing values

### Step 4: Test Health Endpoint

1. Visit: `https://connect-campus-1663.onrender.com/api/health`
2. Should return: `{"status":"OK","message":"Server is running"}`
3. If this works but `/api/auth/test` doesn't → routing issue
4. If this doesn't work → server not running or wrong port

---

## 🎯 **MOST LIKELY ISSUES (Priority Order)**

1. **Root Directory not set to `backend`** (90% of cases)
2. **Service sleeping** (free tier)
3. **Old code deployed** (deployment not updating)
4. **Wrong Node version** (ES modules not supported)
5. **Port mismatch** (PORT env var not set)

---

## ✅ **QUICK FIX CHECKLIST**

- [ ] Root Directory = `backend`
- [ ] Start Command = `npm start`
- [ ] Build Command = `npm install`
- [ ] Branch = `main`
- [ ] Auto-Deploy = Enabled
- [ ] Node Version = 18.x or 20.x
- [ ] All environment variables set
- [ ] Health Check Path = `/api/health`
- [ ] Service is not sleeping
- [ ] Latest deployment matches latest GitHub commit

---

## 🚨 **IMMEDIATE ACTION ITEMS**

1. **Check Root Directory in Render** - This is #1 most common issue
2. **Check Render Logs** - Look for our debug messages
3. **Verify Start Command** - Must be `npm start`
4. **Check if service is sleeping** - Wait 30-60 seconds for first request
5. **Trigger manual redeploy** - Clear cache and redeploy

---

**After checking these, share:**
1. What Root Directory is set to
2. What Start Command is set to
3. What you see in Render logs (especially our debug messages)
4. Whether `/api/health` works


