# Setup and Testing Guide

This guide provides complete instructions to clone, setup, and test the Production-Ready Payment Gateway project.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL (v12+)
- RabbitMQ
- Git
- Docker (optional, for containerized setup)

## Step 1: Clone the Repository

```bash
# Using Git Bash (Windows) or Terminal (Mac/Linux)
git clone https://github.com/sarayu1201/production-ready.git
cd production-ready
```

## Step 2: Backend Setup

### 2.1 Install Backend Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_gateway

# API Configuration
PORT=5000
NODE_ENV=development
API_SECRET=your_secret_key_here
JWT_SECRET=your_jwt_secret

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost

# Webhook Configuration
WEBHOOK_TIMEOUT=30000
MAX_WEBHOOK_RETRIES=3
```

### 2.3 Setup Database

```bash
# Create PostgreSQL database
creatdb payment_gateway

# Run migrations
node src/db/migrate.js
```

### 2.4 Start Backend Server

```bash
npm start
# Or for development with auto-reload
npm run dev
```

You should see: "✓ Server running on http://localhost:5000"

## Step 3: Frontend Setup

### 3.1 Install Dashboard Dependencies

```bash
cd ../frontend/dashboard
npm install
```

### 3.2 Start Dashboard

```bash
npm start
```

Dashboard will open at http://localhost:3000

### 3.3 Install Checkout Widget Dependencies (Optional)

```bash
cd ../checkout-widget
npm install
npm run build
```

## Step 4: Start Background Worker

In a new terminal:

```bash
cd backend
node src/workers/worker.js
```

You should see: "✓ Worker initialized successfully"

## Step 5: Testing

### 5.1 Test Database Connection

```bash
cd backend
node -e "const pool = require('./src/db/connection'); pool.query('SELECT NOW()', (err, res) => { if (err) console.error(err); else console.log('✓ Database connected'); process.exit(); })"
```

### 5.2 Test API Endpoints

```bash
# Create a new payment
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "card"
  }'

# Get all payments
curl http://localhost:5000/api/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a refund
curl -X POST http://localhost:5000/api/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "paymentId": "PAYMENT_ID",
    "reason": "Customer requested"
  }'
```

### 5.3 Test with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 5.4 Run Unit Tests

```bash
cd backend
npm test

cd ../frontend/dashboard
npm test
```

## Step 6: Verify All Components

### Checklist

- [ ] Database is running: `psql -U postgres -d payment_gateway -c "SELECT NOW()"`
- [ ] Backend server is running on port 5000
- [ ] Frontend dashboard is running on port 3000
- [ ] Worker is processing messages
- [ ] RabbitMQ is accessible on port 5672
- [ ] All API endpoints are responding
- [ ] Dashboard loads without errors

## Troubleshooting

### Database Connection Error

```bash
# Ensure PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql # Mac

# Check if database exists
psql -l | grep payment_gateway
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 PID
```

### RabbitMQ Connection Error

```bash
# Ensure RabbitMQ is running
sudo service rabbitmq-server start  # Linux
brew services start rabbitmq # Mac
```

## API Documentation

### Authentication

All API endpoints require JWT token in Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

### Payment Endpoints

- `POST /api/payments` - Create payment
- `GET /api/payments` - List all payments
- `GET /api/payments/:id` - Get payment details
- `PATCH /api/payments/:id` - Update payment

### Refund Endpoints

- `POST /api/refunds` - Create refund
- `GET /api/refunds` - List refunds
- `GET /api/refunds/:id` - Get refund details

### Tenant Management

- `POST /api/tenants` - Create tenant
- `GET /api/tenants` - List tenants
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

## Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Check database query performance
PSQLRC=~/.psqlrc psql -U postgres -d payment_gateway
# Then: EXPLAIN ANALYZE SELECT * FROM payments;
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` and `API_SECRET`
3. Configure database with SSL
4. Enable CORS with specific origins
5. Set up proper logging and monitoring
6. Use environment-specific configuration
7. Enable rate limiting on API endpoints
8. Set up automated backups

## Support

For issues or questions, refer to:
- `COMPLETE_SETUP.md` - Detailed setup instructions
- `IMPLEMENTATION_GUIDE.md` - Implementation details
- `ALL_FILES_CODE.md` - Complete file listing with code
