# ✅ Google OAuth - Next Steps After Console Fix

## 🔧 **STEP 1: Verify Render Environment Variables**

Go to your Render dashboard and check that these environment variables are set:

### Required Variables:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://connect-campus-backend.onrender.com/api/auth/google/callback
CLIENT_URL=https://connect-campus-vercel.vercel.app
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=10000
```

**Important:**
- Replace `connect-campus-backend` with your actual Render service name if different
- Replace `connect-campus-vercel` with your actual Vercel URL if different
- `GOOGLE_CALLBACK_URL` must match exactly what you saved in Google Console

---

## 🧪 **STEP 2: Test the OAuth Flow**

### Option A: Test via Frontend (Recommended)
1. Go to your Vercel frontend URL: `https://connect-campus-vercel.vercel.app`
2. Click "Login" or "Sign Up"
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you should be redirected back to your app

### Option B: Test Backend Directly
1. Visit: `https://connect-campus-backend.onrender.com/auth/google`
2. You should be redirected to Google OAuth
3. After authorization, you'll be redirected to the callback URL

---

## ✅ **STEP 3: Verify Everything Works**

### Check These:
- [ ] Google OAuth consent screen appears
- [ ] After authorization, redirects back to your app
- [ ] User is logged in successfully
- [ ] No `redirect_uri_mismatch` errors
- [ ] User profile is created/updated correctly

---

## 🐛 **If You Still Get Errors**

### Error: `redirect_uri_mismatch`
- Double-check Google Console redirect URI matches exactly
- Verify `GOOGLE_CALLBACK_URL` in Render matches Google Console
- Make sure there are no trailing slashes or extra characters

### Error: `invalid_client`
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render are correct
- Check that credentials are for the correct Google Cloud project

### Error: Connection timeout
- Check Render service is running (not sleeping)
- Verify backend health: `https://connect-campus-backend.onrender.com/api/health`

---

## 📝 **Quick Checklist**

- [x] Google Console redirect URI fixed: `https://connect-campus-backend.onrender.com/api/auth/google/callback`
- [ ] Render `GOOGLE_CALLBACK_URL` set correctly
- [ ] Render `GOOGLE_CLIENT_ID` set
- [ ] Render `GOOGLE_CLIENT_SECRET` set
- [ ] Render `CLIENT_URL` points to Vercel frontend
- [ ] Tested OAuth flow end-to-end

---

## 🎉 **You're Ready!**

Once all environment variables are set and you've tested the flow, Google OAuth should work perfectly in production!

**Need Help?** Check the Render logs if you encounter any issues.

