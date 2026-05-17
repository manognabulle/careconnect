import React, { useEffect, useState } from 'react';
import { Icon, icons } from '../icons';
import { api, handleResponse } from '../api';

export function PharmacyDashboard({ user, medicines, pharmacies, stock, setStock, addToast, emergencyRequests }) {
  const [view, setView] = useState('inventory');
  const pharmacyId = parseInt(user.pharmacyId, 10) || 1;
  const myPharmacy = pharmacies.find((pharmacy) => pharmacy.id === pharmacyId) || pharmacies[0];
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    Promise.all([
      api.getOrders(pharmacyId),
      api.getReservations(pharmacyId)
    ]).then(([ordersData, resData]) => {
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setReservations(Array.isArray(resData) ? resData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [pharmacyId]);

  const updateStockQty = async (medicineId, newQty) => {
    const data = await api.updateStock({ pharmacy_id: pharmacyId, medicine_id: medicineId, quantity: newQty });
    if (data.error) {
      addToast(data.error, 'em');
      return;
    }
    setStock((prev) => ({ ...prev, [pharmacyId]: { ...prev[pharmacyId], [medicineId]: newQty } }));
    addToast('Stock updated successfully.', 'ok');
  };

  const handleOrder = async (orderId, status) => {
    const updated = await fetch(`https://careconnect-rjfs.onrender.com/api/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ order_status: status }),
    }).then(handleResponse);
    if (updated.error) {
      addToast(updated.error, 'em');
      return;
    }
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    addToast(`Order #${orderId} status updated to ${status}.`, 'info');
  };

  const analytics = {
    totalOrders: orders.length,
    revenue: orders.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    lowStock: Object.values(stock[pharmacyId] || {}).filter((quantity) => quantity < 10).length,
  };

  const Countdown = ({ until }) => {
    const [status, setStatus] = useState({ label: 'RESERVED', time: '', color: 'var(--teal)' });

    useEffect(() => {
      if (!until || isNaN(new Date(until).getTime())) {
        setStatus({ label: 'EXPIRED', time: '--', color: 'var(--red)' });
        return;
      }

      const timer = setInterval(() => {
        const now = new Date();
        const reservedUntil = new Date(until);
        const bufferUntil = new Date(reservedUntil.getTime() + 5 * 60000);

        if (now < reservedUntil) {
          const diff = reservedUntil - now;
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setStatus({ label: 'RESERVED', time: `${mins}:${secs < 10 ? '0' : ''}${secs}`, color: 'var(--teal)' });
        } else if (now < bufferUntil) {
          const diff = bufferUntil - now;
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setStatus({ label: 'BUFFER', time: `${mins}:${secs < 10 ? '0' : ''}${secs}`, color: 'var(--amber)' });
        } else {
          setStatus({ label: 'EXPIRED', time: '0:00', color: 'var(--red)' });
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }, [until]);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: status.color, fontSize: 13 }}>{status.label}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{status.time}</span>
      </div>
    );
  };

  if (loading) return <div className="empty">Loading pharmacy data...</div>;

  return (
    <div className="pharmacy-dashboard-container">
      <div className="pharmacy-header-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        padding: '24px 32px',
        background: 'linear-gradient(135deg, var(--navy) 0%, #1e293b 100%)',
        borderRadius: 20,
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="pharmacy-logo-large" style={{
            width: 64,
            height: 64,
            background: 'var(--teal)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            boxShadow: '0 0 20px rgba(13, 148, 136, 0.3)'
          }}>
            {myPharmacy?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              {myPharmacy?.name || 'Pharmacy Dashboard'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, color: '#f1f5f9', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.map} size={14} /> {myPharmacy?.area}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.phone} size={14} /> {myPharmacy?.phone || '+91 80 4567 8901'}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tag rx" style={{ fontSize: 10, padding: '4px 12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', marginBottom: 8, color: 'white' }}>
            PHARMACY ID: #{pharmacyId}
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>Owner: {myPharmacy?.owner_name || 'Authorized Personnel'}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {[
          { id: 'inventory', label: 'Inventory', icon: icons.pill },
          { id: 'orders', label: 'Orders', icon: icons.cart },
          { id: 'reservations', label: 'Reservations', icon: icons.history },
          { id: 'emergency', label: 'Emergency', icon: icons.alert },
          { id: 'analytics', label: 'Dashboard', icon: icons.dashboard },
        ].map((tab) => (
          <button key={tab.id} className={`tab ${view === tab.id ? 'active' : ''}`} onClick={() => setView(tab.id)}>
            <Icon d={tab.icon} size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {view === 'inventory' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Stock Management</div><div className="tag rx">{analytics.lowStock} Low Stock Items</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="pharm-table">
              <thead><tr><th>Medicine</th><th>Category</th><th>Current Stock</th><th>Action</th></tr></thead>
              <tbody>
                {medicines.map((medicine) => {
                  const quantity = stock[pharmacyId]?.[medicine.id] || 0;
                  return (
                    <tr key={medicine.id}>
                      <td style={{ fontWeight: 600 }}>{medicine.name}</td>
                      <td><span className="tag cat">{medicine.category}</span></td>
                      <td>{quantity}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => updateStockQty(medicine.id, quantity + 10)}>Refill</button>
                          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => {
                            const value = prompt('Enter new quantity:', quantity);
                            if (value !== null) updateStockQty(medicine.id, parseInt(value, 10) || 0);
                          }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'orders' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Customer Orders</div></div>
          <div className="card-body">
            {orders.length === 0 ? <div className="empty">No orders found</div> : orders.map((order) => (
              <div key={order.id} className="stock-row" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>Order #{order.id}</div>
                    <span className={`tag ${order.payment_status === 'paid' ? 'otc' : 'rx'}`}>{order.payment_status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{order.user_name}  {order.user_email}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {(Array.isArray(order.items) ? order.items : []).map((item) => `${item.name} (x${item.qty})`).join(', ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 20 }}>
                  <div className="med-price" style={{ fontSize: 18 }}>Rs {order.total_amount}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {order.order_status === 'reserved' && <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => handleOrder(order.id, 'dispatched')}>Dispatch</button>}
                  {order.order_status === 'dispatched' && <button className="btn btn-outline" style={{ fontSize: 11, borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => handleOrder(order.id, 'fulfilled')}>Fulfill</button>}
                  {order.order_status === 'fulfilled' && <span className="tag otc" style={{ padding: '6px 12px' }}>FULFILLED</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reservations' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Medicine Reservations</div></div>
          <div className="card-body">
            {reservations.length === 0 ? <div className="empty">No active reservations</div> : (
              <table className="pharm-table">
                <thead><tr><th>Medicine</th><th>Quantity</th><th>Hold Until</th><th>Countdown</th><th>Status</th></tr></thead>
                <tbody>
                  {reservations.map(res => (
                    <tr key={res.id}>
                      <td style={{ fontWeight: 600 }}>{res.medicine_name}</td>
                      <td>{res.quantity} units</td>
                      <td style={{ fontSize: 12 }}>{new Date(res.reserved_until).toLocaleTimeString()}</td>
                      <td>{res.status === 'pending' ? <Countdown until={res.reserved_until} /> : <span className="tag otc">CONFIRMED</span>}</td>
                      <td><span className={`tag ${res.status === 'pending' ? 'rx' : 'otc'}`}>{res.status.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'emergency' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Emergency Requests</div><span className="pulse">LIVE BROADCAST</span></div>
          <div className="card-body">
            {emergencyRequests.filter(r => r.status === 'pending' || r.pharmacy_id === pharmacyId).length === 0 ? (
              <div className="empty">No active emergency requests</div>
            ) : (
              emergencyRequests
                .filter(r => r.status === 'pending' || r.pharmacy_id === pharmacyId)
                .map((request) => (
                  <div key={request.id} className={`em-card ${request.status === 'fulfilled' ? 'fulfilled' : request.priority}`} style={{ marginBottom: 10 }}>
                    <div className="em-card-inner">
                      <div className={`priority-dot ${request.priority}`} />
                      <div className="em-info">
                        <div className="em-medicine" style={{ fontWeight: 700, fontSize: 16 }}>{request.medicine_name || request.medicine}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Patient: <span style={{ fontWeight: 600, color: 'white' }}>{request.patient_name || request.patient}</span> |
                          Priority: <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{request.priority}</span> |
                          Time: {request.time}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {request.status === 'pending' && (
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 11, padding: '8px 16px' }}
                            onClick={() => api.acceptEmergency(request.id).then(fetchDashboardData)}
                          >
                            Accept & Dispatch
                          </button>
                        )}
                        {request.status === 'accepted' && request.pharmacy_id === pharmacyId && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: 11, padding: '8px 16px', background: 'var(--green)' }}
                            onClick={() => api.updateEmergency(request.id, 'fulfilled', pharmacyId).then(fetchDashboardData)}
                          >
                            Mark Fulfilled
                          </button>
                        )}
                        <span className={`em-status ${request.status === 'pending' ? 'critical' : 'accepted'}`} style={{ padding: '6px 12px', fontSize: 10 }}>
                          {request.status === 'pending' ? 'BROADCAST' : request.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {view === 'analytics' && (
        <div className="grid-2">
          <div className="stat-card blue"><div className="stat-icon blue"><Icon d={icons.cart} size={20} /></div><div className="stat-value">{analytics.totalOrders}</div><div className="stat-label">Total Orders Handled</div></div>
          <div className="stat-card teal"><div className="stat-icon teal"><Icon d={icons.sparkle} size={20} /></div><div className="stat-value">Rs {analytics.revenue}</div><div className="stat-label">Total Revenue (Paid)</div></div>
          <div className="stat-card amber"><div className="stat-icon amber"><Icon d={icons.alert} size={20} /></div><div className="stat-value">{analytics.lowStock}</div><div className="stat-label">Items Below Threshold</div></div>
          <div className="stat-card red"><div className="stat-icon red"><Icon d={icons.bell} size={20} /></div><div className="stat-value">{emergencyRequests.filter((request) => request.status === 'pending').length}</div><div className="stat-label">Active Emergencies</div></div>
        </div>
      )}
    </div>
  );
}
