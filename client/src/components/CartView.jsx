import React from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function CartView({ user, cart, setCart, setPage, addToast }) {
  const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const updateQty = (id, pharmacy_id, delta) => { setCart(cart.map(i => i.id === id && i.pharmacy_id === pharmacy_id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)); };
  const remove = (id, pharmacy_id) => { setCart(cart.filter(i => !(i.id === id && i.pharmacy_id === pharmacy_id))); };

  if (cart.length === 0) {
    return <div className="empty" style={{ padding: 100 }}><div style={{ fontSize: 40 }}></div><div className="empty-text">Your cart is empty</div><button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("search")}>Shop Now</button></div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Shopping Cart ({cart.length} items)</div></div>
        <div className="card-body">
          {cart.map(i => (
            <div key={`${i.id}-${i.pharmacy_id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
              <div><div style={{ fontWeight: 700 }}>{i.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Sold by: {i.pharmacyName}</div><div style={{ fontSize: 14, color: "var(--teal)", fontWeight: 600, marginTop: 4 }}>{i.price} each</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", borderRadius: 8, padding: "4px 8px" }}>
                  <button className="btn" style={{ padding: "2px 8px" }} onClick={() => updateQty(i.id, i.pharmacy_id, -1)}>-</button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{i.qty}</span>
                  <button className="btn" style={{ padding: "2px 8px" }} onClick={() => updateQty(i.id, i.pharmacy_id, 1)}>+</button>
                </div>
                <div style={{ fontWeight: 700, width: 80, textAlign: "right" }}>{i.price * i.qty}</div>
                <button style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer" }} onClick={() => remove(i.id, i.pharmacy_id)}>Remove</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--mint)", padding: 20, borderRadius: 12 }}>
            <div><div style={{ fontSize: 14, color: "var(--teal-dark)" }}>Total payable amount</div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--teal-dark)" }}>{total}</div></div>
            <button className="btn btn-primary" style={{ padding: "12px 32px" }} onClick={() => setPage("checkout")}>Proceed to Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
