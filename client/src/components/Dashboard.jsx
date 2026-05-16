import React from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function Dashboard({ medicines, pharmacies, stock, emergencyRequests, addToast }) {
  const totalMeds = medicines.length;
  const totalPharm = pharmacies.length;
  const emCount = emergencyRequests.filter(e => e.status === "pending").length;
  const lowStock = Object.values(stock).flatMap(ph => Object.entries(ph)).filter(([, q]) => q < 10).length;

  return (
    <div>
      <div className="stats-grid">
        {[
          { label: "Total Medicines", value: totalMeds, icon: icons.pill, color: "teal", change: "up", changeText: "Full catalogue active" },
          { label: "Active Pharmacies", value: totalPharm, icon: icons.pharmacy, color: "blue", change: "up", changeText: "All locations open" },
          { label: "Emergency Requests", value: emCount, icon: icons.alert, color: "red", change: "warn", changeText: `${emCount} pending response` },
          { label: "Low Stock Items", value: lowStock, icon: icons.bell, color: "amber", change: "warn", changeText: "Reorder recommended" },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}><Icon d={s.icon} size={20} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-change ${s.change}`}>{s.changeText}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Emergency Requests</div><span className={`tag rx`} style={{ background: "var(--red-light)", color: "var(--red)" }}>Live</span></div>
          <div className="card-body">
            {emergencyRequests.map(er => (
              <div key={er.id} className={`em-card ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} style={{ marginBottom: 10 }}>
                <div className="em-card-inner">
                  <div className={`priority-dot ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} />
                  <div className="em-info">
                    <div className="em-medicine">{er.medicine}</div>
                    <div className="em-patient">Patient: {er.patient}  {er.time}</div>
                  </div>
                  <span className={`em-status ${er.status === "pending" ? "critical" : er.status === "dispatched" ? "dispatched" : "fulfilled"}`}>{er.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Top Pharmacies</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="pharm-table">
              <thead><tr><th>Pharmacy</th><th>Area</th><th>Rating</th></tr></thead>
              <tbody>
                {pharmacies.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: "var(--muted)" }}>{p.area}</td>
                    <td><span className="rating-badge"> {p.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">System Information</div>
        </div>
        <div className="card-body" style={{ color: 'var(--muted)', fontSize: 13 }}>
          All medicines and pharmacies are synchronized in real-time.
        </div>
      </div>
    </div>
  );
}
