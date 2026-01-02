# 🎯 Custom Domain Cookie Setup Guide

## ✅ **YES - Buying a Domain Will Solve the Cookie Issue!**

### **Current Problem:**
- **Frontend:** `connect-campus-ashen.vercel.app` (Vercel)
- **Backend:** `connect-campus-l663.onrender.com` (Render)
- **Issue:** Different domains = Cross-domain cookies = `sameSite: 'none'` required
- **Brave Browser:** Blocks `sameSite: 'none'` cookies by default ❌

### **Solution with Custom Domain:**
- **Frontend:** `app.yourdomain.com` (or `yourdomain.com`)
- **Backend:** `api.yourdomain.com`
- **Benefit:** Subdomains = Same-site cookies = `sameSite: 'lax'` works ✅
- **Brave Browser:** Allows `sameSite: 'lax'` cookies ✅

---

## 🏗️ **Domain Setup Options**

### **Option 1: Subdomains (Recommended)**
```
Frontend: app.yourdomain.com (Vercel)
Backend:  api.yourdomain.com (Render)
```

**Benefits:**
- ✅ Cookies work with `sameSite: 'lax'` (Brave compatible)
- ✅ Clean separation of frontend/backend
- ✅ Easy to scale (add more subdomains later)
- ✅ Professional setup

### **Option 2: Same Domain**
```
Frontend: yourdomain.com (Vercel)
Backend:  api.yourdomain.com (Render)
```

**Benefits:**
- ✅ Cookies work with `sameSite: 'lax'`
- ✅ Main domain for marketing/SEO
- ✅ API subdomain for backend

---

## 📋 **Step-by-Step Setup**

### **Step 1: Buy Domain**
- Buy from: Namecheap, GoDaddy, Google Domains, etc.
- Example: `connectcampus.com` or `connect-campus.com`

### **Step 2: Configure Vercel (Frontend)**

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain:
   - For subdomain: `app.yourdomain.com`
   - For main domain: `yourdomain.com`
3. Vercel will show DNS records to add:
   ```
   Type: CNAME
   Name: app (or @ for root)
   Value: cname.vercel-dns.com
   ```

### **Step 3: Configure Render (Backend)**

1. Go to Render Dashboard → Your Service → Settings → Custom Domains
2. Add custom domain: `api.yourdomain.com`
3. Render will show DNS records:
   ```
   Type: CNAME
   Name: api
   Value: your-service.onrender.com
   ```

### **Step 4: Update DNS Records**

Go to your domain registrar (where you bought the domain):

1. **Add Vercel CNAME:**
   ```
   Type: CNAME
   Name: app (or @)
   Value: cname.vercel-dns.com
   ```

2. **Add Render CNAME:**
   ```
   Type: CNAME
   Name: api
   Value: your-service.onrender.com
   ```

3. **Wait for DNS propagation** (5-60 minutes)

### **Step 5: Update Environment Variables**

**Vercel (Frontend):**
```env
VITE_API_URL=https://api.yourdomain.com
```

**Render (Backend):**
```env
CLIENT_URL=https://app.yourdomain.com
NODE_ENV=production
```

### **Step 6: Update Google OAuth**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Update **Authorized redirect URIs:**
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```
5. Save changes

### **Step 7: Update Cookie Settings**

The code will automatically detect custom domains and use `sameSite: 'lax'` instead of `'none'`.

**Current Logic:**
- If domain contains `vercel.app` or `onrender.com` → `sameSite: 'none'`
- If custom domain → `sameSite: 'lax'` ✅

---

## 🔧 **Code Changes Needed**

The cookie logic already handles this! It checks:
- If `CLIENT_URL` contains `vercel.app` or `onrender.com` → use `sameSite: 'none'`
- Otherwise (custom domain) → use `sameSite: 'lax'`

**Location:** `backend/src/controllers/authController.js`

```javascript
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.CLIENT_URL?.includes('vercel.app') ||
                     process.env.CLIENT_URL?.includes('onrender.com') ||
                     !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

// If custom domain (not vercel.app/onrender.com), use 'lax'
const sameSite = (isProduction && !process.env.CLIENT_URL?.includes('vercel.app') && !process.env.CLIENT_URL?.includes('onrender.com')) 
  ? 'lax'  // Custom domain = same-site
  : (isProduction ? 'none' : 'lax');  // Cross-domain = 'none', localhost = 'lax'
```

**Actually, we should update this logic to be clearer!**

---

## ✅ **After Setup - What Changes?**

### **Before (Current):**
- ❌ Brave blocks cookies (`sameSite: 'none'`)
- ❌ Users must disable Brave Shields
- ❌ Google OAuth fails in Brave

### **After (Custom Domain):**
- ✅ Brave allows cookies (`sameSite: 'lax'`)
- ✅ No need to disable Brave Shields
- ✅ Google OAuth works in all browsers
- ✅ Better user experience

---

## 🧪 **Testing Checklist**

After setting up custom domain:

1. ✅ **DNS Propagation:**
   - Check: `nslookup app.yourdomain.com`
   - Should resolve to Vercel

2. ✅ **Frontend Access:**
   - Visit: `https://app.yourdomain.com`
   - Should load your app

3. ✅ **Backend Access:**
   - Visit: `https://api.yourdomain.com/api/health`
   - Should return: `{"status":"OK"}`

4. ✅ **Google OAuth:**
   - Click "Continue with Google"
   - Should work in Brave without disabling Shields

5. ✅ **Cookies:**
   - Check DevTools → Application → Cookies
   - Should see `token` cookie with `SameSite: Lax` (not `None`)

---

## 💰 **Cost Estimate**

- **Domain:** $10-15/year (e.g., Namecheap, GoDaddy)
- **Vercel:** Free (custom domains included)
- **Render:** Free (custom domains included)
- **Total:** ~$10-15/year

---

## 🎯 **Summary**

**YES, buying a domain will solve the cookie issue!**

- ✅ Subdomains = Same-site cookies
- ✅ `sameSite: 'lax'` works in Brave
- ✅ No need to disable Brave Shields
- ✅ Better user experience
- ✅ Professional setup

**Next Steps:**
1. Buy a domain
2. Set up subdomains (app.yourdomain.com, api.yourdomain.com)
3. Update environment variables
4. Update Google OAuth redirect URI
5. Test in Brave browser

---

**Status:** Ready to implement when you buy a domain! 🚀

