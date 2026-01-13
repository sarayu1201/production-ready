import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    completedTransactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch payments from backend
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPayments(data);
      calculateStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setLoading(false);
    }
  };

  const calculateStats = (paymentList) => {
    const stats = {
      totalRevenue: 0,
      totalTransactions: paymentList.length,
      pendingTransactions: 0,
      completedTransactions: 0
    };

    paymentList.forEach(payment => {
      stats.totalRevenue += payment.amount;
      if (payment.status === 'pending') stats.pendingTransactions++;
      if (payment.status === 'completed') stats.completedTransactions++;
    });

    setStats(stats);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Payment Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p className="stat-value">{stats.totalTransactions}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value">{stats.pendingTransactions}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-value">{stats.completedTransactions}</p>
        </div>
      </div>

      <div className="payments-section">
        <h2>Recent Payments</h2>
        <table className="payments-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>${payment.amount.toFixed(2)}</td>
                <td><span className={`status-${payment.status}`}>{payment.status}</span></td>
                <td>{new Date(payment.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
