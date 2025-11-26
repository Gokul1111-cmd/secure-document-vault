# Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 2: Configure Environment

**Frontend** - Create `/.env`:
```env
VITE_API_URL=http://localhost:5000
```

**Backend** - Create `/server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="your-mysql-connection-string"
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_STORAGE_BUCKET=your-bucket-name
```

### Step 3: Generate Encryption Keys
```bash
cd server
node scripts/generateKeys.js
```

### Step 4: Setup Database
```bash
cd server
npx prisma migrate deploy
# or for development
npx prisma migrate dev
```

### Step 5: Start Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Step 6: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📝 Test Account
You can register a new account or use these test credentials after running the E2E test:
- Email: `gok@gmail.com`
- Password: `aaaaaa`
- PIN: `123456`

## 🧪 Run Tests
```bash
cd server
node scripts/e2e.js
```

## ✅ Verify Installation
1. Open http://localhost:5173
2. Register a new account
3. Upload a document
4. Download/view with PIN
5. Check admin dashboard (if admin role)

## 🐛 Common Issues

### Port already in use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 5173 (frontend)
npx kill-port 5173
```

### Database connection failed
- Check MySQL is running
- Verify DATABASE_URL is correct
- Check SSL mode for Aiven MySQL

### Firebase errors
- Verify Firebase credentials
- Check storage bucket exists
- Ensure service account has Storage Admin role

## 📚 Documentation
- Full deployment guide: `DEPLOYMENT.md`
- API documentation: `/server/README.md`
- Frontend setup: `/README.md`

## 🎯 Features Completed
✅ User authentication (register/login)
✅ Document upload with encryption
✅ Document download/view with PIN
✅ Admin dashboard
✅ Audit logs
✅ Profile settings
✅ Toast notifications
✅ Loading states
✅ Error handling

## 🔄 Next Steps
- Connect admin features to real backend APIs
- Add real-time notifications
- Implement document sharing
- Add multi-factor authentication
- Deploy to production

---

**Need help?** Check `DEPLOYMENT.md` for detailed instructions.
