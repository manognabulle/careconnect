import React, { useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function LoginScreen({ onLogin, addToast, pharmacies = [], doctors = [] }) {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', role: 'user', password: '', pharmacyId: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignup && form.role === 'pharmacy' && !form.pharmacyId) {
      addToast('Please select a pharmacy', 'warn');
      return;
    }

    const payload = isSignup
      ? {
          name: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          pharmacyId: form.pharmacyId || undefined,
          doctorId: form.role === 'doctor' ? doctors.find(d => d.email === form.email || d.name === form.username)?.id : undefined,
        }
      : { email: form.email, password: form.password };

    const data = isSignup ? await api.register(payload) : await api.login(form.email, form.password);
    if (data.error || data.errors || !data.token || !data.user) {
      addToast('Unable to process request. Please try again.', 'em');
      return;
    }

    const normalizedUser = {
      ...data.user,
      username: data.user.name,
      doctorId: data.user.doctorId ?? data.user.doctor_id ?? null,
      pharmacyId: data.user.pharmacyId ?? data.user.pharmacy_id ?? null,
    };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    onLogin(normalizedUser);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, border: 'none', background: 'var(--navy-light)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="logo-icon" style={{ width: 48, height: 48, borderRadius: 12 }}>
              <Icon d={icons.pill[0]} size={24} stroke="white" />
            </div>
          </div>
          <div className="card-title" style={{ textAlign: 'center', fontSize: 24, color: 'white' }}>{isSignup ? 'Create Account' : 'CareConnect Login'}</div>
          <div style={{ textAlign: 'center', color: 'var(--muted-light)', fontSize: 14, marginTop: 8 }}>{isSignup ? 'Join the network' : 'Secure Login'}</div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className="form-group">
                <label className="form-label" style={{ color: 'white' }}>Full Name</label>
                <input className="form-input" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. John Doe" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" style={{ color: 'white' }}>{isSignup ? 'Email Address' : 'Email or Name'}</label>
              <input className="form-input" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} placeholder={isSignup ? "email@example.com" : "e.g. Dr. Anil Kumar or email"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'white' }}>Password</label>
              <input className="form-input" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} type="password" placeholder="Enter password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {isSignup && (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'white' }}>Role</label>
                  <select className="form-input form-select" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, pharmacyId: '' })}>
                    <option value="user" style={{ background: 'var(--navy)' }}>User / Patient</option>
                    <option value="pharmacy" style={{ background: 'var(--navy)' }}>Pharmacy Staff</option>
                    <option value="doctor" style={{ background: 'var(--navy)' }}>Medical Doctor</option>
                  </select>
                </div>
                {form.role === 'pharmacy' && (
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'white' }}>Select Pharmacy</label>
                    <select className="form-input form-select" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} value={form.pharmacyId} onChange={(e) => setForm({ ...form, pharmacyId: e.target.value })} required>
                      <option value="" style={{ background: 'var(--navy)' }}>-- Choose Pharmacy --</option>
                      {pharmacies.map((pharmacy) => <option key={pharmacy.id} value={pharmacy.id} style={{ background: 'var(--navy)' }}>{pharmacy.name}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 10, borderRadius: '12px' }}>
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--muted-light)' }}>
            {isSignup ? 'Already a member-' : "New to CareConnect-"}{' '}
            <button type="button" onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              {isSignup ? 'Login' : 'Join Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
