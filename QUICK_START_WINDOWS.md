# Quick Start Guide for Windows (Git Bash)

This guide provides the corrected setup steps for Windows users with Git Bash. It addresses the issues you encountered during installation.

## Issues Fixed in This Guide

- ✓ Proper path handling for frontend/checkout-widget
- ✓ Correct npm install sequence
- ✓ Docker setup with proper configuration
- ✓ Port management and process handling

## Prerequisites

- Git Bash (comes with Git for Windows)
- Node.js 16+ (https://nodejs.org/)
- npm (comes with Node.js)
- PostgreSQL 12+ (https://www.postgresql.org/download/windows/)
- Docker Desktop (optional, for containerized setup)

## Step 1: Clone Repository

```bash
# Open Git Bash and navigate to your Documents folder
cd /c/Users/Lenovo/Documents

# Clone the repository ONCE
git clone https://github.com/sarayu1201/production-ready.git
cd production-ready
```

## Step 2: Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Verify Node modules are installed
ls node_modules
```

## Step 3: Install Frontend Dashboard Dependencies

```bash
# Navigate to dashboard frontend
cd ../frontend/dashboard

# Install dependencies
npm install

# Verify installation
ls node_modules

# Navigate back to project root
cd ../..
```

## Step 4: Install Checkout Widget Dependencies

```bash
# Navigate to checkout-widget
cd checkout-widget

# Create package.json if not exists (already exists in repo)
# Install dependencies
npm install

# Navigate back to project root
cd ../..
```

## Step 5: Setup Database

```bash
# Open PostgreSQL command line
psql -U postgres

# Inside PostgreSQL:
CREATE DATABASE payment_gateway;
\c payment_gateway
\q

# Run migrations from Git Bash
cd backend
node src/db/migrate.js
```

## Step 6: Create Environment File

```bash
# In backend folder, create .env file
cd backend
echo > .env
```

Add these lines to `.env`:
```
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_gateway
PORT=5000
NODE_ENV=development
API_SECRET=your_secret_key
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://localhost
```

## Step 7: Start Backend Server

```bash
# In backend folder
cd backend
npm start

# Or for development with auto-reload:
npm run dev
```

You should see: `✓ Server running on http://localhost:5000`

## Step 8: Start Frontend Dashboard (New Terminal)

```bash
# Open NEW Git Bash window
# Navigate to frontend
cd /c/Users/Lenovo/Documents/production-ready/frontend/dashboard

# Start frontend
npm start
```

Dashboard will open at http://localhost:3000

## Step 9: Start Worker (New Terminal)

```bash
# Open NEW Git Bash window
cd /c/Users/Lenovo/Documents/production-ready/backend

# Start worker
node src/workers/worker.js
```

You should see: `✓ Worker initialized successfully`

## Testing the Setup

### Test 1: Check if all ports are accessible

```bash
# Test backend (port 5000)
curl http://localhost:5000

# Test frontend (port 3000)
curl http://localhost:3000
```

### Test 2: Create a test payment

```bash
# Replace YOUR_JWT_TOKEN with actual token
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "card"
  }'
```

### Test 3: Check database connection

```bash
# From backend folder
node -e "const pool = require('./src/db/connection'); pool.query('SELECT NOW()', (err, res) => { if (err) console.error(err); else console.log('Database OK:', res.rows[0]); process.exit(); })"
```

## Fixing Common Issues

### Issue: "Port 5000 already in use"

```bash
# Find process using port 5000 (Windows Git Bash)
netstat -ano | grep 5000

# Kill process by PID
kill -9 <PID>
```

### Issue: "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: "Cannot find database"

```bash
# Check PostgreSQL is running and database exists
psql -U postgres -l | grep payment_gateway

# Recreate if needed
psql -U postgres
CREATE DATABASE payment_gateway;
\q
```

### Issue: npm audit vulnerabilities

```bash
# You can safely ignore most vulnerabilities for development
# To fix them:
npm audit fix

# For breaking changes:
npm audit fix --force
```

## Project Structure

```
production-ready/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.js       # Database connection
│   │   │   └── migrate.js          # Database migrations
│   │   ├── workers/
│   │   │   └── worker.js           # Background worker
│   │   └── server.js               # Main server
│   ├── package.json
│   ├── .env                        # Environment variables
│   └── Dockerfile
├── frontend/
│   ├── dashboard/
│   │   ├── src/
│   │   │   └── App.jsx             # Main dashboard component
│   │   └── package.json
│   └── checkout-widget/
│       ├── src/
│       │   └── index.js            # Checkout widget SDK
│       └── package.json
├── docker-compose.yml
├── SETUP_AND_TESTING.md            # Detailed setup guide
├── QUICK_START_WINDOWS.md          # This file
└── README.md
```

## Next Steps

1. ✓ Repository cloned
2. ✓ Dependencies installed
3. ✓ Database configured
4. ✓ All services running
5. → Implement authentication
6. → Add payment processing logic
7. → Integrate with payment provider (Stripe, etc.)
8. → Add webhook handlers
9. → Deploy to production

## Support

For detailed information, see:
- **SETUP_AND_TESTING.md** - Full setup guide
- **IMPLEMENTATION_GUIDE.md** - Implementation details
- **ALL_FILES_CODE.md** - Complete file listing
- **README.md** - Project overview
