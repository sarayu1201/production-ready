# Production-Ready Payment Gateway with Async Processing & Webhooks

A complete, enterprise-grade payment gateway system featuring asynchronous job processing, webhook delivery with retry mechanisms, embeddable JavaScript SDK, and refund management.

## Features

✅ **Asynchronous Payment Processing** - Redis-based job queues with worker services
✅ **Webhook System** - HMAC-signed webhook delivery with automatic retries (5 attempts with exponential backoff)
✅ **Embeddable SDK** - JavaScript SDK for merchants to integrate payments without redirects
✅ **Refund Management** - Full and partial refund support with async processing
✅ **Idempotency Keys** - Prevent duplicate charges on network retries
✅ **Enhanced Dashboard** - Webhook configuration, delivery logs, manual retry functionality
✅ **Docker Support** - Complete containerization with docker-compose

## Project Structure

```
production-ready/
├── backend/                      # Node.js Express API
│   ├── src/
│   │   ├── models/              # Database models
│   │   ├── routes/              # API endpoints
│   │   ├── workers/             # Job workers (Payment, Webhook, Refund)
│   │   ├── jobs/                # Job definitions
│   │   ├── middleware/          # Auth, error handling
│   │   ├── utils/               # Utilities (HMAC, crypto, etc.)
│   │   └── server.js            # Main server file
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── dashboard/               # React dashboard
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── App.jsx
│   │   ├── Dockerfile
│   │   └── package.json
│   └── checkout-widget/         # Embeddable SDK
│       ├── src/
│       │   ├── sdk/
│       │   │   ├── PaymentGateway.js
│       │   │   ├── modal.js
│       │   │   └── styles.css
│       │   └── iframe-content/
│       ├── webpack.config.js
│       ├── package.json
│       └── dist/
├── docker-compose.yml           # Multi-container orchestration
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis 7+
- Docker & Docker Compose
- Git Bash (for Windows)

### Installation via Git Bash

```bash
# Clone the repository
git clone https://github.com/sarayu1201/production-ready.git
cd production-ready

# Using Docker Compose (Recommended)
docker-compose up -d

# Or setup locally
cd backend && npm install && npm run dev
cd ../frontend/dashboard && npm install && npm start
```

### Environment Variables

Create `.env` file in backend:
```
DATABASE_URL=postgresql://gateway_user:gateway_pass@localhost:5432/payment_gateway
REDIS_URL=redis://localhost:6379
NODE_ENV=development
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
WEBHOOK_RETRY_INTERVALS_TEST=true
PORT=8000
```

## API Endpoints

### Payment Endpoints
- `POST /api/v1/payments` - Create payment (idempotent)
- `POST /api/v1/payments/{id}/capture` - Capture payment
- `POST /api/v1/payments/{id}/refunds` - Create refund
- `GET /api/v1/refunds/{id}` - Get refund status

### Webhook Endpoints
- `GET /api/v1/webhooks` - List webhook logs
- `POST /api/v1/webhooks/{id}/retry` - Manually retry webhook

### Test Endpoints
- `GET /api/v1/test/jobs/status` - Job queue status

## Testing All Components

### 1. Test Database & Migrations
```bash
# Create tables and indexes
cd backend
npm run migrate

# Verify database
npm run test:db
```

### 2. Test Job Queue
```bash
# Check job queue status
curl http://localhost:8000/api/v1/test/jobs/status

# Expected Response:
# {
#   "pending": 0,
#   "processing": 0,
#   "completed": 10,
#   "failed": 0,
#   "worker_status": "running"
# }
```

### 3. Test Payment Creation
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: unique_123" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_test_123",
    "method": "upi",
    "vpa": "user@paytm"
  }'
```

### 4. Test Webhooks
```bash
# Create a test merchant webhook receiver
node test-merchant/webhook-receiver.js

# Configure webhook URL in dashboard: http://host.docker.internal:4000/webhook
# Send test webhook from dashboard
```

### 5. Test Refunds
```bash
curl -X POST http://localhost:8000/api/v1/payments/pay_xxxxx/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 25000, "reason": "Customer request"}'
```

### 6. Test SDK Integration
```html
<script src="http://localhost:3001/checkout.js"></script>
<button id="pay-button">Pay Now</button>
<script>
  document.getElementById('pay-button').addEventListener('click', () => {
    const checkout = new PaymentGateway({
      key: 'key_test_abc123',
      orderId: 'order_test_123',
      onSuccess: (response) => console.log('Success:', response),
      onFailure: (error) => console.log('Failed:', error)
    });
    checkout.open();
  });
</script>
```

## Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api          # API logs
docker-compose logs -f worker       # Worker logs
docker-compose logs -f postgres     # Database logs

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Server | 8000 | http://localhost:8000 |
| Checkout Dashboard | 3001 | http://localhost:3001 |
| pgAdmin (DB) | 5050 | http://localhost:5050 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

## Webhook Retry Schedule

| Attempt | Delay | Production | Test Mode |
|---------|-------|------------|----------|
| 1 | 0s | Immediate | Immediate |
| 2 | 1m | 60s | 5s |
| 3 | 5m | 300s | 10s |
| 4 | 30m | 1800s | 15s |
| 5 | 2h | 7200s | 20s |

## Database Schema

### Tables
- `merchants` - Merchant accounts
- `payments` - Payment records
- `refunds` - Refund records
- `webhook_logs` - Webhook delivery history
- `idempotency_keys` - Cached idempotent responses

### Indexes
- `refunds.payment_id`
- `webhook_logs.merchant_id`
- `webhook_logs.status`
- `webhook_logs.next_retry_at` (filtered: status = 'pending')

## Common Issues & Solutions

**Issue: Worker not processing jobs**
- Check if Redis is running: `redis-cli ping`
- Check worker logs: `docker-compose logs worker`
- Verify REDIS_URL environment variable

**Issue: Webhooks not being delivered**
- Ensure merchant has `webhook_url` configured
- Check webhook logs in dashboard
- Verify HMAC signature matches

**Issue: Idempotency not working**
- Check `idempotency_keys` table has records
- Verify expiry time (24 hours from creation)
- Same merchant_id + key must match

**Issue: SDK not loading**
- Check webpack build output in `frontend/checkout-widget/dist/`
- Verify CORS headers on checkout service
- Check browser console for loading errors

## Performance Considerations

- **Job Processing**: 90%+ success rate for UPI, 95% for cards
- **Webhook Retries**: Up to 5 attempts over ~2.5 hours
- **Database Indexes**: Optimized for webhook and refund queries
- **Redis TTL**: Idempotency keys expire after 24 hours

## Security Features

- HMAC-SHA256 webhook signatures
- API Key + Secret authentication
- Idempotency keys for duplicate prevention
- HTTPS-ready (configurable per environment)
- Database-backed webhook logs (no in-memory state)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
