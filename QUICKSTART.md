# Quick Start Guide

## 🚀 Local Development Setup (5 minutes)

### Option 1: Automated Setup (Recommended - Windows)
```powershell
.\setup-local.ps1
```

### Option 2: Manual Setup

#### Step 1: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

#### Step 2: Configure Environment

**Frontend** - Create `/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** - Create `/server/.env`:
```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

DATABASE_URL="your-mysql-connection-string"

JWT_ACCESS_SECRET=your-access-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PASSWORD_SALT_ROUNDS=12

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_STORAGE_BUCKET=your-bucket-name

RSA_PRIVATE_KEY_PATH=keys/private.pem
RSA_PUBLIC_KEY_PATH=keys/public.pem

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15
AUDIT_LOG_SAMPLING_RATE=1
```

#### Step 3: Generate Encryption Keys
```bash
cd server
node scripts/generateKeys.js
cd ..
```

#### Step 4: Setup Database
```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # Optional - adds test data
cd ..
```

#### Step 5: Start Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Or run both at once (requires concurrently package):**
```bash
npm run dev:full
```

#### Step 6: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 🌐 Production Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variable in Vercel:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
4. Deploy automatically

### Backend (Render)
1. Create new Web Service on Render
2. Connect your repository
3. Set root directory: `server`
4. Build command: `npm install && npm run prisma:generate`
5. Start command: `npm start`
6. Add environment variables from `server/.env.render`
7. Deploy

**📖 See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed deployment guide**

---

## 📝 Test Account
You can register a new account or use these test credentials after running the seed:
- Email: `gok@gmail.com`
- Password: `aaaaaa`
- PIN: `123456`

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start frontend only
npm run server:dev       # Start backend only
npm run dev:full         # Start both (requires concurrently)
```

### Build & Preview
```bash
npm run build            # Build frontend for production
npm run preview          # Preview production build
```

### Database
```bash
cd server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database with test data
npm run db:push          # Push schema changes without migration
```

### Testing
```bash
cd server
node scripts/e2e.js      # Run end-to-end tests
```

---

## ✅ Verify Installation
1. Open http://localhost:5173
2. Register a new account
3. Upload a document
4. Download/view with PIN
5. Check admin dashboard (if admin role)

---

## 🐛 Common Issues

### Port already in use
```bash
# Windows PowerShell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force  # Backend
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force  # Frontend
```

### Database connection failed
- Check MySQL is running
- Verify DATABASE_URL is correct
- Check SSL mode for Aiven MySQL (use `?ssl-mode=REQUIRED`)
- Ensure database exists

### CORS errors
- Verify `CLIENT_ORIGIN` in `server/.env` matches frontend URL
- For local: `http://localhost:5173`
- For production: Your Vercel URL

### API returns 404
- Check `VITE_API_URL` in `.env` includes `/api` suffix
- Ensure backend is running
- Verify no typos in environment variables

### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Frontend
rm -rf .vite dist
npm run build

# Backend
cd server
rm -rf node_modules package-lock.json
npm install
npm run prisma:generate
```

---

## 📚 Documentation

- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Complete environment setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions  
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase configuration
- [server/README.md](./server/README.md) - Backend documentation

---

## 🔐 Security Notes

- Never commit `.env` files (they're in `.gitignore`)
- Use strong, unique secrets in production
- Rotate JWT secrets periodically
- Keep Firebase credentials secure
- Enable HTTPS in production (automatic with Vercel/Render)

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
