# ✅ Google OAuth Configuration Verification

## 🔍 **VERIFIED ROUTE STRUCTURE**

### Backend Callback Route
**File:** `backend/src/routes/authRoutes.js` (line 42)
- Route definition: `router.get('/google/callback', ...)`
- Mounted at: `app.use('/api/auth', authRoutes);` (line 89 in `backend/index.js`)
- **Full callback path:** `/api/auth/google/callback` ✅

### Frontend Login URL
**File:** `frontend/src/services/authService.js` (line 31)
- Function: `getGoogleAuthUrl()`
- Returns: `${API_BASE_URL}/auth/google`
- **Full login path:** `/auth/google` ✅
- **Note:** Also mounted at `app.use('/auth', authRoutes);` (line 95), so both `/auth/google` and `/api/auth/google` work

---

## 🔧 **GOOGLE CLOUD CONSOLE CONFIGURATION**

### ✅ **CORRECT Authorized Redirect URIs**

Add these **exact** URLs in Google Cloud Console → OAuth Client → Authorized redirect URIs:

#### Production (Render Backend)
```
https://connect-campus-backend.onrender.com/api/auth/google/callback
```

#### Local Development (Optional - for testing)
```
http://localhost:5000/api/auth/google/callback
```

---

## ⚠️ **COMMON MISTAKES TO AVOID**

### ❌ **INCORRECT** (Missing `http` or `https`):
```
s://connect-campus-backend.onrender.com/api/auth/google/callback
connect-campus-backend.onrender.com/api/auth/google/callback
/api/auth/google/callback
```

### ❌ **INCORRECT** (Wrong path):
```
https://connect-campus-backend.onrender.com/auth/google/callback
https://connect-campus-backend.onrender.com/google/callback
```

### ✅ **CORRECT**:
```
https://connect-campus-backend.onrender.com/api/auth/google/callback
```

---

## 📋 **VERIFICATION CHECKLIST**

- [x] Backend callback route confirmed: `/api/auth/google/callback`
- [x] Frontend login URL confirmed: `/auth/google` (works via `/auth` mount)
- [x] Route mounts verified:
  - Primary: `app.use('/api/auth', authRoutes);`
  - Secondary: `app.use('/auth', authRoutes);` (for OAuth compatibility)
- [x] Passport.js uses `process.env.GOOGLE_CALLBACK_URL` when set
- [x] Local dev fallback: `http://localhost:5000/api/auth/google/callback`

---

## 🚀 **PRODUCTION SETUP**

### Render Environment Variables
Set in Render dashboard:
```env
GOOGLE_CALLBACK_URL=https://connect-campus-backend.onrender.com/api/auth/google/callback
```

**Replace `connect-campus-backend` with your actual Render service name if different.**

### Google Cloud Console Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. Under **Authorized redirect URIs**, add:
   ```
   https://connect-campus-backend.onrender.com/api/auth/google/callback
   ```
5. Click **Save**

---

## 🧪 **TESTING**

### Test the callback route directly:
```bash
# Should return authentication flow (not a 404)
curl https://connect-campus-backend.onrender.com/api/auth/google/callback
```

### Test the login initiation:
```bash
# Should redirect to Google OAuth
curl -L https://connect-campus-backend.onrender.com/auth/google
```

---

## ✅ **SUMMARY**

**Backend Callback Route:** `/api/auth/google/callback` ✅  
**Frontend Login URL:** `/auth/google` ✅  
**Google Console Redirect URI:** `https://connect-campus-backend.onrender.com/api/auth/google/callback` ✅

**The issue was a typo in Google Console** - the redirect URI was saved as `s://...` instead of `https://...`. Fix it in Google Cloud Console, not in code.

---

**Last Verified:** Current codebase  
**Status:** ✅ Routes confirmed, ready for Google Console configuration fix



