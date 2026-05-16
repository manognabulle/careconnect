import React, { useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function EmergencySystem({ pharmacies, emergencyRequests, addToast, user }) {
  const [showForm, setShowForm] = useState(false);
   const [form, setForm] = useState({ medicine: '', patient: '', priority: 'high', pharmacy: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPharmacy = user?.role === 'pharmacy';

  async function submitRequest() {
    if (!form.medicine.trim() || !form.patient.trim()) {
      addToast("Please provide both medicine and patient names.", "em");
      return;
    }
    
    setIsSubmitting(true);
    const data = await api.createEmergency({ medicine: form.medicine, patient: form.patient, priority: form.priority });
    setIsSubmitting(false);

    if (data.error || data.errors) {
      addToast("Unable to process emergency alert. Please try again.", "em");
      return;
    }
    addToast("Emergency request sent successfully.", "ok");
    setForm({ medicine: '', patient: '', priority: 'high', pharmacy: '' });
    setShowForm(false);
  }

  async function updateStatus(id, status) {
    const data = await api.updateEmergency(id, status, isPharmacy ? (user.pharmacyId || user.pharmacy_id) : null);
    if (data.error) addToast(data.error, 'em');
  }

  return (
    <div>
      {/* Users only see the request form */}
      {user.role === 'user' && (
        <div className="card" style={{ border: '2px solid var(--red)' }}>
          <div className="card-header" style={{ background: 'var(--red-light)' }}>
            <div className="card-title" style={{ color: 'var(--red)' }}>New Emergency Medicine Request</div>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input className="form-input" placeholder="e.g. Epinephrine 1mg" value={form.medicine} onChange={(e) => setForm((current) => ({ ...current, medicine: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input className="form-input" placeholder="Patient full name" value={form.patient} onChange={(e) => setForm((current) => ({ ...current, patient: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select className="form-input form-select" value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
            </div>
            <button className="btn btn-danger" style={{ width: '100%', marginTop: 10 }} onClick={submitRequest} disabled={isSubmitting}>
              <Icon d={icons.bell} size={16} />
              {isSubmitting ? 'Sending Alert...' : 'Send Emergency Alert'}
            </button>
          </div>
        </div>
      )}

      {/* Pharmacies only see the live feed */}
      {user.role === 'pharmacy' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Live Emergency Feed</div></div>
          <div className="card-body">
            {emergencyRequests.length === 0 ? <div className="empty">No emergency requests</div> : emergencyRequests.map((request) => (
              <div key={request.id} className={`em-card ${request.status === 'fulfilled' ? 'fulfilled' : request.priority}`} style={{ marginBottom: 10 }}>
                <div className="em-card-inner">
                  <div className={`priority-dot ${request.status === 'fulfilled' ? 'fulfilled' : request.priority}`} />
                  <div className="em-info">
                    <div className="em-medicine">{request.medicine_name || request.medicine}</div>
                    <div className="em-patient">Patient: {request.patient_name || request.patient} | Broadcast Time: {request.time}</div>
                  </div>
                  <span className={`em-status ${request.status === 'pending' ? 'critical' : request.status === 'accepted' ? 'dispatched' : 'fulfilled'}`}>{request.status.toUpperCase()}</span>
                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => updateStatus(request.id, 'accepted')}>Accept & Dispatch</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

