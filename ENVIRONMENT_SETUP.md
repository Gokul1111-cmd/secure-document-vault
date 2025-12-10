# Environment Setup Guide

This guide explains how to set up the project for **local development** and **production deployment** (Vercel + Render).

## 📁 Project Structure

```
project/
├── .env                    # Frontend - Local development (gitignored)
├── .env.local             # Frontend - Local override (gitignored)
├── .env.production        # Frontend - Production config (gitignored)
├── .env.example           # Frontend - Template for setup
└── server/
    ├── .env               # Backend - Local development (gitignored)
    ├── .env.local         # Backend - Local override (gitignored)
    ├── .env.render        # Backend - Render deployment reference
    └── .env.example       # Backend - Template for setup
```

---

## 🚀 Quick Start

### 1️⃣ Local Development Setup

#### **Frontend Setup**

1. **Copy environment template:**
   ```bash
   copy .env.example .env
   ```

2. **Edit `.env`** with your local backend URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Install dependencies & run:**
   ```bash
   npm install
   npm run dev
   ```
   Frontend will run at: `http://localhost:5173`

#### **Backend Setup**

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Copy environment template:**
   ```bash
   copy .env.example .env
   ```

3. **Edit `server/.env`** with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   
   # Database (use your local DB or keep Aiven for development)
   DATABASE_URL="your-database-connection-string"
   
   # JWT Secrets (can be simple for local dev)
   JWT_ACCESS_SECRET=local-dev-access-secret
   JWT_REFRESH_SECRET=local-dev-refresh-secret
   
   # Firebase credentials
   FIREBASE_PROJECT_ID=document-d5572
   FIREBASE_CLIENT_EMAIL=your-firebase-email
   FIREBASE_PRIVATE_KEY="your-firebase-private-key"
   FIREBASE_STORAGE_BUCKET=document-d5572.firebasestorage.app
   ```

4. **Generate RSA keys** (if not exist):
   ```bash
   npm run generate:keys
   ```

5. **Setup database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

6. **Install dependencies & run:**
   ```bash
   npm install
   npm run dev
   ```
   Backend will run at: `http://localhost:5000`

---

## 🌐 Production Deployment

### **Frontend (Vercel)**

1. **Go to Vercel Dashboard** → Import your repository

2. **Set Environment Variables** in Vercel:
   ```
   VITE_API_URL=https://secure-document-vault.onrender.com/api
   ```

3. **Build Settings** (usually auto-detected):
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy** - Vercel will automatically deploy on push to main branch

### **Backend (Render)**

1. **Go to Render Dashboard** → New → Web Service

2. **Connect your repository** and select the `server` directory as root

3. **Configure Service:**
   - Name: `secure-document-vault`
   - Environment: `Node`
   - Build Command: `npm install && npm run prisma:generate`
   - Start Command: `npm start`

4. **Set Environment Variables** in Render (copy from `server/.env.render`):
   ```env
   NODE_ENV=production
   CLIENT_ORIGIN=https://your-vercel-app.vercel.app
   DATABASE_URL=your-production-database-url
   JWT_ACCESS_SECRET=strong-random-secret-here
   JWT_REFRESH_SECRET=another-strong-random-secret
   FIREBASE_PROJECT_ID=document-d5572
   FIREBASE_CLIENT_EMAIL=your-firebase-email
   FIREBASE_PRIVATE_KEY=your-firebase-private-key
   FIREBASE_STORAGE_BUCKET=document-d5572.firebasestorage.app
   RSA_PRIVATE_KEY=your-rsa-private-key
   RSA_PUBLIC_KEY=your-rsa-public-key
   ```

5. **Important:** After first deployment, update Vercel's `VITE_API_URL` with actual Render URL

6. **Deploy** - Render will automatically deploy on push to main branch

---

## 🔄 Switching Between Environments

### **For Local Development:**
```bash
# Frontend
VITE_API_URL=http://localhost:5000/api

# Backend
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

### **For Production:**
```bash
# Frontend (Vercel)
VITE_API_URL=https://secure-document-vault.onrender.com/api

# Backend (Render)
NODE_ENV=production
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
```

---

## 🔐 Security Best Practices

1. **Never commit** `.env` files to git (they're already in `.gitignore`)
2. **Use strong secrets** in production (use password generators)
3. **Rotate JWT secrets** periodically in production
4. **Keep Firebase keys secure** and never expose them publicly
5. **Use HTTPS** for all production traffic (Vercel and Render provide this automatically)

---

## 🛠️ Common Commands

### **Frontend:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

### **Backend:**
```bash
npm run dev          # Start dev server with nodemon
npm start            # Start production server
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run prisma:seed        # Seed database
```

---

## 🐛 Troubleshooting

### **CORS Errors:**
- Ensure `CLIENT_ORIGIN` in backend `.env` matches your frontend URL
- For local: `http://localhost:5173`
- For production: `https://your-vercel-app.vercel.app`

### **Database Connection Issues:**
- Verify `DATABASE_URL` is correct
- Ensure database allows connections from your IP (or Render's IPs for production)
- Check SSL requirements

### **API Not Found (404):**
- Verify `VITE_API_URL` in frontend `.env` is correct
- Ensure backend is running and accessible
- Check for trailing slashes in URLs

### **Build Failures:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all environment variables are set

---

## 📝 Notes

- **Environment Priority:** `.env.local` > `.env.production` > `.env`
- **Vite env vars** must be prefixed with `VITE_` to be accessible in frontend code
- **Database migrations** should be run before starting the backend
- **RSA keys** are required for encryption - generate them before first run

---

## ✅ Checklist Before Deployment

- [ ] All environment variables set in Vercel
- [ ] All environment variables set in Render
- [ ] Database is accessible from Render
- [ ] Firebase credentials are valid
- [ ] RSA keys are generated and configured
- [ ] Frontend builds successfully locally
- [ ] Backend starts successfully locally
- [ ] CORS configured correctly
- [ ] JWT secrets are strong and unique
- [ ] Database migrations are up to date
