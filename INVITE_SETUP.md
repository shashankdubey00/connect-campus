# 🔗 Invite System Setup Guide

## Overview

The invite system generates shareable links that work in both development and production environments. The links are automatically generated using the `CLIENT_URL` environment variable.

## 🔧 Environment Configuration

### Development Setup

In your `backend/.env` file:

```env
CLIENT_URL=http://localhost:5173
```

### Production Setup

**IMPORTANT:** When deploying to production, you **MUST** set the `CLIENT_URL` to your production domain:

```env
CLIENT_URL=https://yourdomain.com
```

Or if using a subdomain:

```env
CLIENT_URL=https://app.yourdomain.com
```

## 📝 How It Works

1. **Backend generates invite links** using the `CLIENT_URL` environment variable
2. **Invite links are stored** in the database with the token
3. **When shared**, users can click the link and it will work regardless of environment
4. **The link format** is: `{CLIENT_URL}/invite/{token}`

## 🚀 Deployment Checklist

### Before Deploying:

- [ ] Set `CLIENT_URL` in your production environment variables
- [ ] Ensure `CLIENT_URL` uses `https://` in production (not `http://`)
- [ ] Test invite link generation after deployment
- [ ] Verify invite links work when shared

### Example Production `.env`:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-strong-secret-key
CLIENT_URL=https://connectcampus.com
PORT=5000
```

## 🔍 Verification

After deployment, test by:

1. Creating an invite link
2. Checking the generated URL - it should use your production domain
3. Sharing the link and verifying it works

## ⚠️ Common Issues

### Issue: Links still show `localhost:5173`

**Solution:** 
- Check that `CLIENT_URL` is set in your production environment
- Restart your backend server after setting the variable
- Verify the variable is loaded: Check server logs for "📡 Client URL: ..."

### Issue: Links don't work after deployment

**Solution:**
- Ensure `CLIENT_URL` matches your frontend domain exactly
- Check that the frontend route `/invite/:token` is properly configured
- Verify CORS settings allow your frontend domain

## 📚 Related Files

- `backend/src/controllers/inviteController.js` - Generates invite URLs
- `backend/src/utils/getClientUrl.js` - Helper function for URL generation
- `frontend/src/pages/Invite.jsx` - Handles invite link rendering
- `backend/src/config/env.js` - Validates CLIENT_URL on startup

