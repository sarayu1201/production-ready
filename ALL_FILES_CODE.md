# ALL REQUIRED FILES & CODE

This document contains all the code and file structures needed to complete the project.
Copy and paste the code into the respective files in your local project.

## QUICK START

After cloning from GitHub:

```bash
cd production-ready
git pull

# Create missing directories
mkdir -p backend/src/{db,workers,models,utils,middleware,routes}

# Install dependencies
cd backend && npm install
cd ../frontend/dashboard && npm install
cd ../checkout-widget && npm install
cd ../../..

# Copy the code from this file into the respective files
# Then start Docker
docker-compose up -d
```

---

## backend/src/db/migrate.js

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrationSQL = `
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_secret VARCHAR(64) UNIQUE NOT NULL,
  webhook_url VARCHAR(512),
  webhook_secret VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  order_id VARCHAR(128) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  method VARCHAR(20) NOT NULL,
  vpa VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  captured BOOLEAN DEFAULT FALSE,
  error_code VARCHAR(50),
  error_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant_id ON webhook_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_logs(next_retry_at) WHERE status = 'pending';

INSERT INTO merchants (email, api_key, api_secret, webhook_secret) 
VALUES ('test@example.com', 'key_test_abc123', 'secret_test_xyz789', 'whsec_test_abc123')
ON CONFLICT DO NOTHING;
`;

(async () => {
  try {
    await pool.query(migrationSQL);
    console.log('\u2705 Database tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\u274c Migration failed:', err);
    process.exit(1);
  }
})();
```

---

## backend/src/workers/worker.js

```javascript
const Queue = require('bull');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const paymentQueue = new Queue('payment-processing', process.env.REDIS_URL);
const refundQueue = new Queue('refund-processing', process.env.REDIS_URL);
const webhookQueue = new Queue('webhook-delivery', process.env.REDIS_URL);

// Process payment jobs
paymentQueue.process(async (job) => {
  const { payment_id } = job.data;
  try {
    const payment = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
    if (payment.rows.length === 0) throw new Error('Payment not found');

    const delay = process.env.TEST_MODE === 'true' ? parseInt(process.env.TEST_PROCESSING_DELAY || 1000) : Math.random() * 5000 + 5000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const isUPI = payment.rows[0].method === 'upi';
    const successRate = isUPI ? 0.9 : 0.95;
    const success = process.env.TEST_MODE === 'true' ? (process.env.TEST_PAYMENT_SUCCESS === 'true') : Math.random() < successRate;

    if (success) {
      await pool.query('UPDATE payments SET status = $1 WHERE id = $2', ['success', payment_id]);
      await webhookQueue.add({ merchant_id: payment.rows[0].merchant_id, event: 'payment.success', payload: payment.rows[0] });
    } else {
      await pool.query('UPDATE payments SET status = $1, error_code = $2, error_description = $3 WHERE id = $4', ['failed', 'PAYMENT_FAILED', 'Payment processing failed', payment_id]);
      await webhookQueue.add({ merchant_id: payment.rows[0].merchant_id, event: 'payment.failed', payload: payment.rows[0] });
    }
    return { status: 'processed' };
  } catch (err) {
    console.error('Payment processing error:', err);
    throw err;
  }
});

// Process refund jobs
refundQueue.process(async (job) => {
  const { refund_id } = job.data;
  try {
    const delay = Math.random() * 2000 + 3000;
    await new Promise(resolve => setTimeout(resolve, delay));
    await pool.query('UPDATE refunds SET status = $1, processed_at = NOW() WHERE id = $2', ['processed', refund_id]);
    return { status: 'processed' };
  } catch (err) {
    console.error('Refund processing error:', err);
    throw err;
  }
});

// Process webhook jobs
webhookQueue.process(async (job) => {
  const { merchant_id, event, payload } = job.data;
  try {
    const merchant = await pool.query('SELECT * FROM merchants WHERE id = $1', [merchant_id]);
    if (merchant.rows.length === 0 || !merchant.rows[0].webhook_url) {
      console.log('No webhook URL configured');
      return { skipped: true };
    }

    const signature = crypto.createHmac('sha256', merchant.rows[0].webhook_secret).update(JSON.stringify(payload)).digest('hex');
    const response = await fetch(merchant.rows[0].webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
      body: JSON.stringify({ event, timestamp: Math.floor(Date.now() / 1000), data: { payment: payload } })
    });

    const logData = { merchant_id, event, payload: JSON.stringify(payload), status: response.ok ? 'success' : 'pending', response_code: response.status };
    await pool.query('INSERT INTO webhook_logs (merchant_id, event, payload, status, response_code, attempts, last_attempt_at) VALUES ($1, $2, $3, $4, $5, 1, NOW())', Object.values(logData));
    return { delivered: response.ok };
  } catch (err) {
    console.error('Webhook delivery error:', err);
    throw err;
  }
});

console.log('\u2705 Worker started and listening for jobs...');
```

---

## frontend/dashboard/src/App.jsx

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/v1/test/jobs/status');
      setPayments([res.data]);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <h1>Payment Gateway Dashboard</h1>
      <button onClick={fetchPayments}>Refresh</button>
      {loading ? <p>Loading...</p> : (
        <div className="status-card">
          {payments.length > 0 && (
            <div>
              <p>Pending Jobs: {payments[0].pending}</p>
              <p>Processing: {payments[0].processing}</p>
              <p>Completed: {payments[0].completed}</p>
              <p>Failed: {payments[0].failed}</p>
              <p>Worker Status: {payments[0].worker_status}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
```

---

## frontend/dashboard/src/index.jsx

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## frontend/checkout-widget/src/sdk/PaymentGateway.js

```javascript
class PaymentGateway {
  constructor(options) {
    this.options = options;
    this.modal = null;
  }

  open() {
    this.createModal();
    this.setupMessageListener();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'payment-gateway-modal';
    modal.setAttribute('data-test-id', 'payment-modal');
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <button class="close-button" data-test-id="close-modal-button">×</button>
          <iframe
            data-test-id="payment-iframe"
            src="http://localhost:3001/checkout?order_id=${this.options.orderId}&embedded=true"
            width="100%"
            height="600px"
            frameborder="0"
          ></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modal = modal;
    modal.querySelector('.close-button').onclick = () => this.close();
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'payment_success') {
        this.options.onSuccess && this.options.onSuccess(event.data.data);
        this.close();
      } else if (event.data.type === 'payment_failed') {
        this.options.onFailure && this.options.onFailure(event.data.data);
      }
    });
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.options.onClose && this.options.onClose();
    }
  }
}

window.PaymentGateway = PaymentGateway;
export default PaymentGateway;
```

---

## DEPLOYMENT COMMANDS

After creating all files:

```bash
cd /c/Users/Lenovo/Documents/production-ready

# Pull latest
git pull

# Install everything
cd backend && npm install
cd ../frontend/dashboard && npm install
cd ../checkout-widget && npm install
cd ../../..

# Start Docker
docker-compose up -d

# Check status
docker-compose ps

# Test API
curl http://localhost:8000/health
```

All services will be running!

✅ API: http://localhost:8000
✅ Dashboard: http://localhost:3000
✅ Checkout: http://localhost:3001
