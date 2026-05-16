import React, { useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function Checkout({ user, cart, setCart, addToast, setPage }) {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState('');
  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handlePay = async () => {
    if (cart.length === 0) return addToast('Your cart is empty.', 'warn');
    if (!payMethod) return addToast('Please select a payment method.', 'warn');
    setLoading(true);
    addToast('Processing transaction...', 'info');

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pharmacyGroups = cart.reduce((acc, item) => {
        if (!acc[item.pharmacy_id]) acc[item.pharmacy_id] = [];
        acc[item.pharmacy_id].push(item);
        return acc;
      }, {});

      for (const [pharmacyId, items] of Object.entries(pharmacyGroups)) {
        const pharmacyTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const orderItems = items.map((item) => ({ medicine_id: item.id, name: item.name, qty: item.qty, price: item.price }));
        const orderData = await api.createOrder({
          pharmacy_id: parseInt(pharmacyId, 10),
          user_name: user.username,
          user_email: user.email,
          items: orderItems,
          total_amount: pharmacyTotal,
          payment_status: 'paid',
          order_status: 'reserved',
        });
        if (orderData.error || orderData.errors) throw new Error(orderData.error || orderData.errors?.[0]?.msg || 'Order creation failed');

        for (const item of items) {
          const currentStock = item.available_qty || 100;
          const stockData = await api.updateStock({
            pharmacy_id: parseInt(pharmacyId, 10),
            medicine_id: item.id,
            quantity: Math.max(0, currentStock - item.qty),
          });
          if (stockData.error) throw new Error(stockData.error);
        }
      }

      await fetch('http://localhost:5000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Order Confirmation: CareConnect',
          htmlContent: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"><div style="background: #0d9488; padding: 20px; color: white; text-align: center;"><h1 style="margin: 0; font-size: 24px;">Order Confirmed</h1></div><div style="padding: 30px;"><p>Hi <strong>${user.username}</strong>, your payment of <strong>Rs ${total}</strong> was successful.</p><p>Your medicines are now reserved and the pharmacy has been notified.</p></div></div>`,
        }),
      });

      addToast('Payment completed successfully.', 'ok');
      setCart([]);
      setPage('search');
    } catch (err) {
      console.error(err);
      addToast('Unable to process request. Please try again.', 'em');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Checkout Summary</div></div>
        <div className="card-body">
          <div style={{ marginBottom: 20 }}>
            {cart.map((item) => <div key={`${item.id}-${item.pharmacy_id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}><span>{item.name} x {item.qty}</span><span>Rs {item.price * item.qty}</span></div>)}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, fontWeight: 700, fontSize: 18 }}><span>Order Total</span><span style={{ color: 'var(--teal)' }}>Rs {total}</span></div>
          </div>
          <div className="form-group"><label className="form-label">Select Payment Method</label><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{['UPI / Netbanking', 'Credit / Debit Card', 'Cash on Delivery'].map((method) => (<label key={method} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: `1.5px solid ${payMethod === method ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: payMethod === method ? 'var(--mint)' : 'white' }}><input type="radio" name="pay" value={method} onChange={() => setPayMethod(method)} style={{ accentColor: 'var(--teal)' }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{method}</span></label>))}</div></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, marginTop: 24 }} onClick={handlePay} disabled={loading}>
            {loading ? 'Confirming Payment...' : `Complete Transaction (Rs ${total})`}
          </button>
        </div>
      </div>
    </div>
  );
}
