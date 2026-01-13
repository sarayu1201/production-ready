const pool = require('../db/connection');
const amqp = require('amqplib');

let channel;

const initWorker = async () => {
  try {
    console.log('Initializing message queue worker...');

    // Connect to RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    // Declare queue for payment processing
    await channel.assertQueue('payment-processing', { durable: true });
    await channel.assertQueue('webhook-queue', { durable: true });
    await channel.assertQueue('refund-queue', { durable: true });

    // Set prefetch to 1 to ensure fair dispatch
    await channel.prefetch(1);

    // Process payment messages
    channel.consume('payment-processing', async (msg) => {
      if (msg) {
        try {
          const { paymentId, amount, tenantId } = JSON.parse(msg.content.toString());
          console.log(`Processing payment: ${paymentId}`);

          // Simulate payment processing
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Update payment status
          await pool.query(
            'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
            ['completed', paymentId]
          );

          console.log(`Payment ${paymentId} processed successfully`);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing payment:', error);
          channel.nack(msg, false, true); // Requeue on error
        }
      }
    });

    // Process webhook messages
    channel.consume('webhook-queue', async (msg) => {
      if (msg) {
        try {
          const { tenantId, eventType, payload } = JSON.parse(msg.content.toString());
          console.log(`Sending webhook: ${eventType}`);

          // Get tenant webhook URL
          const result = await pool.query(
            'SELECT webhook_url FROM tenants WHERE id = $1',
            [tenantId]
          );

          if (result.rows[0]?.webhook_url) {
            await sendWebhook(result.rows[0].webhook_url, { eventType, payload });
          }

          channel.ack(msg);
        } catch (error) {
          console.error('Error sending webhook:', error);
          channel.nack(msg, false, true);
        }
      }
    });

    console.log('✓ Worker initialized successfully');
  } catch (error) {
    console.error('✗ Worker initialization error:', error);
    setTimeout(initWorker, 5000); // Retry after 5 seconds
  }
};

const sendWebhook = async (url, data) => {
  const fetch = (await import('node-fetch')).default;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

module.exports = { initWorker };
