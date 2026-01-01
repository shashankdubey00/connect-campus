# ⚡ Quick Deployment Steps

## 🎯 **BACKEND → RENDER**

### 1. Create Web Service
- Go to [Render Dashboard](https://dashboard.render.com/)
- New + → Web Service
- Connect GitHub repo

### 2. Configure
```
Name: connect-campus-backend
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### 3. Environment Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_32_char_secret
CLIENT_URL=https://your-frontend.vercel.app
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment
- Copy your backend URL: `https://xxx.onrender.com`

---

## 🎨 **FRONTEND → VERCEL**

### 1. Create Project
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Add New → Project
- Import GitHub repo

### 2. Configure
```
Framework: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

### 3. Environment Variables
```env
VITE_BACKEND_URL=https://your-backend.onrender.com
```

### 4. Deploy
- Click "Deploy"
- Wait for deployment
- Copy your frontend URL: `https://xxx.vercel.app`

### 5. Update Backend CORS
- Go back to Render
- Update `CLIENT_URL` with your Vercel URL
- Auto-redeploys

---

## ✅ **TEST**

1. Backend: `https://your-backend.onrender.com/api/health`
2. Frontend: Visit Vercel URL
3. Test login, messages, etc.

---

## ⚠️ **IMPORTANT**

- **File Uploads:** Render filesystem is ephemeral. Use cloud storage (S3/Cloudinary) for production.
- **Socket.IO:** Works on Render Web Services (paid plans recommended).
- **CORS:** Must match exactly (including https://, no trailing slash).

---

**Full Guide:** See `DEPLOYMENT_GUIDE_RENDER_VERCEL.md`

