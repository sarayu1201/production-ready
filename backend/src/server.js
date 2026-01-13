const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('redis');
const Bull = require('bull');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis & Job Queue
const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
const paymentQueue = new Bull('payment-processing', process.env.REDIS_URL);
const webhookQueue = new Bull('webhook-delivery', process.env.REDIS_URL);
const refundQueue = new Bull('refund-processing', process.env.REDIS_URL);

redisClient.connect().catch(err => console.error('Redis error:', err));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Job status endpoint
app.get('/api/v1/test/jobs/status', async (req, res) => {
  try {
    const counts = await paymentQueue.getJobCounts();
    const workerStatus = redisClient.isOpen ? 'running' : 'stopped';
    res.status(200).json({
      pending: counts.waiting || 0,
      processing: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      worker_status: workerStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create payment endpoint
app.post('/api/v1/payments', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    const { order_id, method, vpa, amount = 50000 } = req.body;

    if (apiKey !== 'key_test_abc123' || apiSecret !== 'secret_test_xyz789') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const paymentId = `pay_${Math.random().toString(36).substr(2, 16)}`;
    const result = await pool.query(
      `INSERT INTO payments (id, order_id, amount, currency, method, vpa, status, merchant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [paymentId, order_id, amount, 'INR', method, vpa, 'pending', 'merchant_test_id']
    );

    const payment = result.rows[0];
    await paymentQueue.add({ payment_id: paymentId }, { attempts: 3 });

    res.status(201).json({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: 'INR',
      method: payment.method,
      vpa: payment.vpa,
      status: 'pending',
      created_at: payment.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create refund endpoint
app.post('/api/v1/payments/:payment_id/refunds', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    const { payment_id } = req.params;
    const { amount, reason } = req.body;

    if (apiKey !== 'key_test_abc123' || apiSecret !== 'secret_test_xyz789') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payment = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
    if (payment.rows.length === 0 || payment.rows[0].status !== 'success') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Payment not refundable' } });
    }

    const refundId = `rfnd_${Math.random().toString(36).substr(2, 16)}`;
    const result = await pool.query(
      `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [refundId, payment_id, 'merchant_test_id', amount, reason, 'pending']
    );

    await refundQueue.add({ refund_id: refundId });

    res.status(201).json({
      id: result.rows[0].id,
      payment_id: result.rows[0].payment_id,
      amount: result.rows[0].amount,
      reason: result.rows[0].reason,
      status: 'pending',
      created_at: result.rows[0].created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get webhook logs
app.get('/api/v1/webhooks', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (apiKey !== 'key_test_abc123' || apiSecret !== 'secret_test_xyz789') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const result = await pool.query(
      `SELECT * FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      ['merchant_test_id', limit, offset]
    );

    const total = await pool.query('SELECT COUNT(*) as count FROM webhook_logs WHERE merchant_id = $1', ['merchant_test_id']);

    res.status(200).json({ data: result.rows, total: parseInt(total.rows[0].count), limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`\u2705 Payment Gateway API running on port ${PORT}`);
  console.log(`\ud83d\udcca Test endpoint: http://localhost:${PORT}/api/v1/test/jobs/status`);
});

module.exports = app;
