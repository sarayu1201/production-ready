import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments');
      const data = await response.json();
      setPayments(data);
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
        headers: { 'Content-Type': 'application/json' },
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

  const filteredPayments = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Payment Gateway Dashboard</h1>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h3>Total Payments</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</p>
        </div>
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px', color: 'green' }}>
          <h3>Completed</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.completed}</p>
        </div>
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px', color: 'orange' }}>
          <h3>Pending</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.pending}</p>
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setFilter('all')} style={{ marginRight: '10px', padding: '8px 16px' }}>All</button>
        <button onClick={() => setFilter('completed')} style={{ marginRight: '10px', padding: '8px 16px' }}>Completed</button>
        <button onClick={() => setFilter('pending')} style={{ marginRight: '10px', padding: '8px 16px' }}>Pending</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : filteredPayments.length === 0 ? (
        <p>No payments found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Payment ID</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Amount</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Created At</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map(payment => (
              <tr key={payment.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{payment.id?.substring(0, 8)}...</td>
                <td style={{ padding: '10px' }}>${payment.amount?.toFixed(2) || 0}</td>
                <td style={{ padding: '10px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: payment.status === 'completed' ? '#d4edda' : '#fff3cd' }}>{payment.status}</span></td>
                <td style={{ padding: '10px' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '10px' }}>
                  {payment.status === 'completed' && (
                    <button onClick={() => handleRefund(payment.id)} style={{ padding: '4px 8px' }}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
