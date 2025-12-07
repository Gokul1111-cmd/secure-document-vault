# Secure Document Vault - Deployment Guide

## Overview
A secure document management system with end-to-end encryption, user authentication, and comprehensive audit logging.

## Features Implemented

### ✅ User Features
- **User Registration & Login** - Complete authentication flow with JWT tokens
- **Document Upload** - Encrypted file upload with AES-256-GCM encryption
- **Document Download** - PIN-protected secure download
- **Document View** - Preview documents in browser with PIN verification
- **Document Delete** - Remove documents permanently
- **Profile Settings** - Update name, password, and PIN
- **Dashboard** - View document statistics and manage files

### ✅ Admin Features
- **Admin Dashboard** - System overview and statistics
- **Audit Logs** - Comprehensive activity tracking and filtering
- **CSV Export** - Export audit logs for compliance
- **User Management** - View and monitor user activity
- **Security Monitoring** - Track failed login attempts and security events

### ✅ Security Features
- **End-to-End Encryption** - AES-256-GCM + RSA-2048 key wrapping
- **PIN Protection** - Separate 6-digit PIN for document access
- **JWT Authentication** - Access and refresh token flow
- **Account Lockout** - Failed login attempt protection
- **Audit Logging** - Complete activity tracking
- **Firebase Storage** - Encrypted file storage
- **MySQL Database** - Secure metadata storage (Aiven hosted)

### ✅ UI/UX Features
- **Toast Notifications** - Non-intrusive success/error messages
- **Loading States** - Spinner animations for async operations
- **Confirmation Modals** - User-friendly confirmation dialogs
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Role-Based Navigation** - Different views for admin and users
- **Error Pages** - Custom 404, 403, and error pages

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Beautiful icon library
- **Axios** - HTTP client with interceptors

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Prisma** - ORM for database
- **MySQL** - Relational database (Aiven)
- **Firebase Admin** - Cloud storage
- **bcryptjs** - Password hashing
- **JWT** - Token-based authentication
- **Multer** - File upload handling

## Project Structure

```
project/
├── src/                          # Frontend source
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── ToastContainer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ConfirmDialog.jsx
│   │   └── forms/
│   │       └── OTPVerification.jsx
│   ├── context/                 # React contexts
│   │   └── AuthContext.jsx
│   ├── pages/                   # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── DashboardUser.jsx
│   │   ├── DashboardAdmin.jsx
│   │   ├── AuditLogs.jsx
│   │   ├── ProfileSettings.jsx
│   │   └── ErrorPage.jsx
│   ├── services/                # API services
│   │   └── api.js
│   ├── config/
│   │   └── firebase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── server/                       # Backend source
│   ├── src/
│   │   ├── controllers/         # Route controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── document.controller.js
│   │   │   └── admin.controller.js
│   │   ├── middleware/          # Express middleware
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   ├── errorHandler.js
│   │   │   └── notFound.js
│   │   ├── routes/              # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── health.routes.js
│   │   │   └── index.js
│   │   ├── services/            # Business logic
│   │   │   ├── encryption.service.js
│   │   │   ├── storage.service.js
│   │   │   └── auditLog.service.js
│   │   ├── config/              # Configuration
│   │   │   ├── env.js
│   │   │   └── prisma.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── index.js
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/
│   ├── scripts/
│   │   ├── generateKeys.js      # RSA key generation
│   │   └── e2e.js              # E2E tests
│   └── keys/                    # RSA encryption keys
│       ├── private.pem
│       └── public.pem
│
└── Configuration Files
    ├── package.json             # Frontend dependencies
    ├── vite.config.ts          # Vite configuration
    ├── tailwind.config.js      # Tailwind CSS config
    ├── .env                    # Environment variables
    └── server/
        ├── package.json        # Backend dependencies
        └── .env               # Backend environment
```

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Backend (server/.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database (Aiven MySQL)
DATABASE_URL="mysql://user:password@host:port/database?ssl-mode=REQUIRED"

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
MAX_FAILED_ATTEMPTS=5
ACCOUNT_LOCK_DURATION=900000

# Firebase Storage
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Encryption Keys (Generated automatically)
RSA_PRIVATE_KEY_PATH=./keys/private.pem
RSA_PUBLIC_KEY_PATH=./keys/public.pem
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MySQL database (or Aiven MySQL)
- Firebase project with Storage enabled

### 1. Clone the Repository
```bash
git clone <repository-url>
cd project
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
```

### 3. Generate RSA Keys
```bash
cd server
node scripts/generateKeys.js
```

### 4. Configure Environment Variables
Create `.env` files in root and `server/` directories with the variables listed above.

### 5. Run Database Migrations
```bash
cd server
npx prisma migrate deploy
```

### 6. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (or 5174 if 5173 is in use)
- Backend: http://localhost:5000

## Production Deployment

### Frontend on Vercel (SPA)

The Vercel deployment is now purely static. Build output is generated by Vite and no longer bundles the Express API.

1. **Automatic build settings** (controlled by `vercel.json`):
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Environment variables** (Project → Settings → Environment Variables):
   - `VITE_API_URL` → base URL of the Render backend, e.g. `https://secure-docs-api.onrender.com/api`
   - Optional: any additional Vite configuration keys your UI needs.

   Configure both Production and Preview environments. For previews you can set `VITE_API_URL` to the Render service URL as well (Render keeps the same hostname for all deploys).

3. **Fallback routing** is handled through the rewrite in `vercel.json`, so client-side routes resolve to `index.html`.

Deploy via the Vercel CLI or Git integration:
```bash
npm i -g vercel
vercel
vercel --prod
```

### Backend on Render (Node Web Service)

1. **Create a new Web Service** in Render pointing to `project/server`.
2. **Build command**:
   ```bash
   npm install
   npx prisma generate
   ```
3. **Start command**:
   ```bash
   npm start
   ```
4. **Environment variables** (Render → Environment):
   - `NODE_ENV=production`
   - `PORT` is provided automatically by Render
   - `DATABASE_URL`
   - `CLIENT_ORIGIN=https://your-frontend-domain.vercel.app,https://*.vercel.app` (wildcards supported)
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_ACCESS_EXPIRES_IN` (optional override)
   - `JWT_REFRESH_EXPIRES_IN` (optional override)
   - `FIREBASE_PROJECT_ID` (optional)
   - `FIREBASE_CLIENT_EMAIL` (optional)
   - `FIREBASE_PRIVATE_KEY` (optional; escape line breaks as `\n`)
   - `FIREBASE_STORAGE_BUCKET` (optional)
   - `RSA_PRIVATE_KEY` and `RSA_PUBLIC_KEY` (copy PEM contents with `\n` escapes)
   - `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` as needed

   The backend accepts comma-separated entries in `CLIENT_ORIGIN`, including wildcards (`https://*.vercel.app`). List your primary domain first (for email links) and add a wildcard to cover preview deployments. Render also injects `RENDER_EXTERNAL_URL`; you may add it to `CLIENT_ORIGIN` if the API needs to call itself via HTTPS links.

5. **Database schema**: after provisioning secrets, run migrations using Render’s shell or a one-off job:
   ```bash
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```
   Seed data is available via `npm run prisma:seed` if you need demo accounts.

6. **Health check**: point Render’s health check to `/api/health` to track liveness.

### Post-Deployment Checklist

- Visit the Render service URL and confirm `/api/health` returns 200.
- Load the Vercel site, log in, and exercise document upload/download flows.
- Verify CORS headers allow requests from both production and preview Vercel domains.
- Confirm emails/reset links use the production frontend URL (first entry in `CLIENT_ORIGIN`).
- Monitor logs on Render for Prisma connection messages and Firebase warnings (expected if storage credentials are omitted).

### Alternate Hosting Paths

- **SPA-only hosting** on platforms like Netlify or S3 works by deploying `dist/` and pointing `VITE_API_URL` to the external API.
- **Other backend hosts** (Railway, Fly.io, AWS, etc.) can run the Express server using `npm start` with the same environment variables and Prisma commands described above.

### Alternative: Docker Deployment

**Dockerfile (Backend):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "src/index.js"]
```

**Build and run:**
```bash
docker build -t secure-vault-backend ./server
docker run -p 5000:5000 --env-file .env secure-vault-backend
```

## Testing

### Run E2E Tests
```bash
cd server
node scripts/e2e.js
```

### Test User Credentials
- Email: `gok@gmail.com`
- Password: `aaaaaa`
- PIN: `123456`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Documents
- `GET /api/docs` - List user documents
- `POST /api/docs/upload` - Upload encrypted document
- `POST /api/docs/:id/view` - View document (requires PIN)
- `POST /api/docs/:id/download` - Download document (requires PIN)
- `DELETE /api/docs/:id` - Delete document

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/logs` - Get audit logs
- `PUT /api/admin/users/:id/role` - Change user role

### Health
- `GET /api/health` - Health check endpoint

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` templates
2. **Rotate JWT secrets** regularly in production
3. **Use HTTPS** for all production deployments
4. **Enable CORS** only for trusted domains
5. **Monitor audit logs** for suspicious activity
6. **Backup database** regularly
7. **Keep dependencies updated** - Run `npm audit`

## Known Limitations & Future Enhancements

### Current Limitations
- Admin features use mock data (will connect to backend later)
- No real-time notifications
- No document sharing between users
- No document versioning

### Planned Enhancements
- [ ] Real-time WebSocket notifications
- [ ] Document sharing with access control
- [ ] Multi-factor authentication (2FA)
- [ ] Document versioning and history
- [ ] Advanced search and filtering
- [ ] Bulk operations (upload/download/delete)
- [ ] User activity analytics
- [ ] API rate limiting dashboard
- [ ] Email notifications
- [ ] Document expiration dates

## Troubleshooting

### Frontend won't connect to backend
- Check `VITE_API_URL` in frontend `.env`
- Ensure backend is running on the correct port
- Check CORS configuration in `server/src/app.js`

### Database connection errors
- Verify `DATABASE_URL` in backend `.env`
- Check MySQL server is running
- Ensure SSL mode is correct for Aiven

### File upload fails
- Verify Firebase credentials in `.env`
- Check storage bucket exists and has correct permissions
- Ensure multer file size limits are appropriate

### JWT errors
- Ensure JWT secrets match between login and verification
- Check token expiration times
- Verify tokens are sent in Authorization header

## Support & Contact
For issues or questions, contact the development team or create an issue in the repository.

## License
[Your License Here]
