# COMPLETE SETUP GUIDE

## STEP 1: CLONE THE REPOSITORY

Open Git Bash and run:

```bash
git clone https://github.com/sarayu1201/production-ready.git
cd production-ready
```

## STEP 2: CREATE DIRECTORY STRUCTURE

Run these commands:

```bash
mkdir -p backend/src/{models,routes,workers,jobs,middleware,utils,db}
mkdir -p frontend/dashboard/src/{components,pages}
mkdir -p frontend/checkout-widget/src/{sdk,iframe-content}
```

## STEP 3: CREATE BACKEND FILES

### 3.1 backend/package.json

Create `backend/package.json` with:
```json
{
  "name": "payment-gateway-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "migrate": "node src/db/migrate.js",
    "test:db": "node src/db/test.js",
    "worker": "node src/workers/worker.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.9.0",
    "redis": "^4.6.0",
    "bull": "^4.10.4",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

### 3.2 backend/.env

Create `backend/.env`:
```
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://gateway_user:gateway_pass@localhost:5432/payment_gateway
REDIS_URL=redis://localhost:6379
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
WEBHOOK_RETRY_INTERVALS_TEST=true
```

### 3.3 backend/Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src

EXPOSE 8000
CMD ["npm", "start"]
```

### 3.4 backend/Dockerfile.worker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src

CMD ["npm", "run", "worker"]
```

### 3.5 backend/src/server.js

Create complete backend server file with all endpoints

### 3.6 backend/src/workers/worker.js

Create background job worker for payment, webhook, and refund processing

### 3.7 backend/src/db/migrate.js

Create database migration script

## STEP 4: CREATE FRONTEND DASHBOARD

### 4.1 frontend/dashboard/package.json

```json
{
  "name": "payment-gateway-dashboard",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.3.0",
    "react-router-dom": "^6.8.0"
  },
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "start": "serve -s build"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": ["last 1 chrome version"],
    "development": ["last 1 chrome version"]
  }
}
```

### 4.2 frontend/dashboard/Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

## STEP 5: CREATE FRONTEND CHECKOUT WIDGET

### 5.1 frontend/checkout-widget/package.json

```json
{
  "name": "payment-gateway-checkout",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.3.0"
  },
  "scripts": {
    "dev": "react-scripts start",
    "build": "webpack --mode production"
  }
}
```

### 5.2 frontend/checkout-widget/Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## STEP 6: INSTALL DEPENDENCIES

```bash
cd backend
npm install
cd ../frontend/dashboard
npm install
cd ../checkout-widget
npm install
cd ../../../
```

## STEP 7: START WITH DOCKER COMPOSE

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on 5432
- Redis on 6379
- API on 8000
- Worker process
- Dashboard on 3000
- Checkout on 3001
- pgAdmin on 5050

## STEP 8: RUN DATABASE MIGRATIONS

```bash
docker-compose exec api npm run migrate
```

## STEP 9: TEST ENDPOINTS

### Test Job Status
```bash
curl http://localhost:8000/api/v1/test/jobs/status
```

### Create a Payment
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: test_123" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_test_001",
    "method": "upi",
    "vpa": "user@paytm",
    "amount": 50000
  }'
```

### Create a Refund
```bash
curl -X POST http://localhost:8000/api/v1/payments/pay_xxxxx/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "reason": "Customer requested"
  }'
```

### Check Webhook Logs
```bash
curl http://localhost:8000/api/v1/webhooks \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

## STEP 10: ACCESS DASHBOARDS

- Dashboard: http://localhost:3000
- Checkout: http://localhost:3001
- API: http://localhost:8000
- pgAdmin: http://localhost:5050 (admin@example.com / admin)

## COMPLETE FILE STRUCTURE

After all files are created, your directory should look like:

```
production-ready/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── models/ (database models)
│   │   ├── routes/ (API endpoints)
│   │   ├── workers/ (job workers)
│   │   ├── jobs/ (job definitions)
│   │   ├── middleware/ (auth, error)
│   │   ├── utils/ (HMAC, crypto)
│   │   └── db/ (migrations)
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── package.json
│   └── .env
├── frontend/
│   ├── dashboard/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── checkout-widget/
│       ├── src/
│       ├── Dockerfile
│       ├── webpack.config.js
│       └── package.json
├── docker-compose.yml
├── .gitignore
├── README.md
└── COMPLETE_SETUP.md
```

## COMMANDS SUMMARY

### Clone & Setup
```bash
git clone https://github.com/sarayu1201/production-ready.git
cd production-ready
mkdir -p backend/src/{models,routes,workers,jobs,middleware,utils,db}
mkdir -p frontend/dashboard/src/{components,pages}
mkdir -p frontend/checkout-widget/src/{sdk,iframe-content}
```

### Start Services
```bash
docker-compose up -d
docker-compose logs -f api
```

### Stop Services
```bash
docker-compose down
```

### Rebuild
```bash
docker-compose up -d --build
```

### View Logs
```bash
docker-compose logs -f api        # API logs
docker-compose logs -f worker     # Worker logs
docker-compose logs -f postgres   # DB logs
```
