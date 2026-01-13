import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    fetchPayments();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setPayments(data);

      // Calculate stats
      const total = data.length;
      const completed = data.filter(p => p.status === 'completed').length;
      const pending = data.filter(p => p.status === 'pending').length;
      setStats({ total, completed, pending });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (paymentId) => {
    try {
      const response = await fetch(`/api/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ paymentId, reason: 'User requested refund' })
      });
      if (response.ok) {
        alert('Refund initiated successfully');
        fetchPayments();
      }
    } catch (error) {
      alert('Failed to process refund');
    }
  };

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter);

  return (
    <div className="container">
      <header className="header">
        <h1>Payment Gateway Dashboard</h1>
        <p>Manage your payments and refunds</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Payments</h3>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-value completed">{stats.completed}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value pending">{stats.pending}</p>
        </div>
      </div>

      <div className="filter-section">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
      </div>

      <div className="payments-table">
        {loading ? (
          <p>Loading...</p>
        ) : filteredPayments.length === 0 ? (
          <p>No payments found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.id.substring(0, 8)}...</td>
                  <td>${payment.amount.toFixed(2)}</td>
                  <td><span className={`status ${payment.status}`}>{payment.status}</span></td>
                  <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                  <td>
                    {payment.status === 'completed' && (
                      <button
                        className="btn-refund"
                        onClick={() => handleRefund(payment.id)}
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
