# Quick Start Script for Local Development
# Run this from the project root directory

Write-Host "🚀 Setting up Secure Document Vault for local development..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists in root
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  Frontend .env not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
    } else {
        Write-Host "📝 Creating default .env..." -ForegroundColor Yellow
        @"
VITE_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✅ Created default .env" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Frontend .env already exists" -ForegroundColor Green
}

Write-Host ""

# Check if server/.env exists
if (-Not (Test-Path "server\.env")) {
    Write-Host "⚠️  Backend .env not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path "server\.env.example") {
        Copy-Item "server\.env.example" "server\.env"
        Write-Host "✅ Created server/.env from server/.env.example" -ForegroundColor Green
        Write-Host "⚠️  Please edit server/.env with your database credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ server/.env.example not found. Please create server/.env manually" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Backend .env already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Gray
Set-Location server
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""

# Check if RSA keys exist
if (-Not (Test-Path "keys\private.pem") -or -Not (Test-Path "keys\public.pem")) {
    Write-Host "🔐 Generating RSA keys..." -ForegroundColor Cyan
    npm run generate:keys
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ RSA keys generated" -ForegroundColor Green
    } else {
        Write-Host "⚠️  RSA key generation failed. You may need to run this manually: npm run generate:keys" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ RSA keys already exist" -ForegroundColor Green
}

Write-Host ""

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma client generation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""

# Ask about database migration
Write-Host "❓ Do you want to run database migrations now? (y/n)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
    npm run prisma:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migrations completed" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "❓ Do you want to seed the database? (y/n)" -ForegroundColor Yellow
        $seedResponse = Read-Host
        if ($seedResponse -eq "y" -or $seedResponse -eq "Y") {
            Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
            npm run prisma:seed
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Database seeded" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Database seeding failed" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠️  Database migrations failed. Check your DATABASE_URL in server/.env" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Skipped database migrations. Run manually with: cd server && npm run prisma:migrate" -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host "1. Review and update server/.env with your credentials" -ForegroundColor Gray
Write-Host "2. Start backend:  cd server && npm run dev" -ForegroundColor Gray
Write-Host "3. Start frontend: npm run dev (in another terminal)" -ForegroundColor Gray
Write-Host ""
Write-Host "Or run both at once: npm run dev:full (requires concurrently package)" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For more info, see ENVIRONMENT_SETUP.md" -ForegroundColor Cyan
Write-Host ""
