// Payment Checkout Widget SDK
// Embeddable payment form for merchant websites

class PaymentCheckoutWidget {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:5000/api';
    this.tenantId = options.tenantId;
    this.token = options.token;
    this.containerId = options.containerId || 'payment-widget';
  }

  async initialize() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id '${this.containerId}' not found`);
      return;
    }

    // Create form HTML
    container.innerHTML = `
      <div class="payment-form">
        <form id="paymentForm">
          <div class="form-group">
            <label>Amount (USD)</label>
            <input type="number" id="amount" step="0.01" required />
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select id="paymentMethod" required>
              <option value="">Select...</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" required />
          </div>
          <button type="submit" class="btn-pay">Pay Now</button>
          <div id="message" class="message"></div>
        </form>
      </div>
      <style>
        .payment-form { font-family: Arial, sans-serif; max-width: 400px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .btn-pay { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn-pay:hover { background: #0056b3; }
        .message { margin-top: 10px; padding: 10px; text-align: center; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
      </style>
    `;

    const form = document.getElementById('paymentForm');
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(event) {
    event.preventDefault();
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = 'Processing...';
    messageDiv.className = '';

    try {
      const amount = parseFloat(document.getElementById('amount').value);
      const paymentMethod = document.getElementById('paymentMethod').value;
      const email = document.getElementById('email').value;

      const response = await fetch(`${this.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          paymentMethod,
          email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        messageDiv.className = 'success';
        messageDiv.innerHTML = `✓ Payment successful! Transaction ID: ${data.id}`;
        document.getElementById('paymentForm').reset();
      } else {
        const error = await response.json();
        messageDiv.className = 'error';
        messageDiv.innerHTML = `✗ Payment failed: ${error.message}`;
      }
    } catch (error) {
      messageDiv.className = 'error';
      messageDiv.innerHTML = `✗ Error: ${error.message}`;
    }
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.PaymentCheckoutWidget = PaymentCheckoutWidget;
}

module.exports = PaymentCheckoutWidget;
