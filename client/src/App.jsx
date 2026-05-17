import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { Icon, icons } from './icons';
import { api } from './api';
import { Dashboard } from './components/Dashboard';
import { MedicineSearch } from './components/MedicineSearch';
import { PharmacyMap } from './components/PharmacyMap';
import { BookAppointment } from './components/BookAppointment';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { EmergencySystem } from './components/EmergencySystem';
import { MedicalUpload } from './components/MedicalUpload';
import { CartView } from './components/CartView';
import { Checkout } from './components/Checkout';
import { Chatbot } from './components/Chatbot';
import { LoginScreen } from './components/LoginScreen';
import { Toast } from './components/Toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const socket = io('https://careconnect-rjfs.onrender.com');

function normalizeUser(user, doctors = []) {
  if (!user) return null;
  const match = doctors.find((doctor) => {
    const doctorName = doctor.name.toLowerCase().replace('dr. ', '').trim();
    const userName = (user.username || user.name || '').toLowerCase().replace('dr. ', '').trim();
    return doctor.id === user.doctorId || doctorName === userName || doctor.email?.toLowerCase() === user.email?.toLowerCase();
  });

  return {
    ...user,
    username: user.username || user.name,
    doctorId: user.doctorId ?? user.doctor_id ?? match?.id ?? null,
    pharmacyId: user.pharmacyId ?? user.pharmacy_id ?? null,
  };
}

export default function CareConnect() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [medicines, setMedicines] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stock, setStock] = useState({});
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'user' && ['dashboard', 'pharmacydash', 'doctordash'].includes(page)) setPage('search');
    if (user.role === 'pharmacy' && !['pharmacydash', 'emergency'].includes(page)) setPage('pharmacydash');
    if (user.role === 'doctor' && !['doctordash', 'doc_schedule', 'doc_prescription', 'doc_profile'].includes(page)) setPage('doctordash');
  }, [user, page]);

  useEffect(() => {
    socket.on('new-emergency-request', (newReq) => {
      setEmergencyRequests((prev) => [
        {
          ...newReq,
          medicine: newReq.medicine_name || newReq.medicine,
          patient: newReq.patient_name || newReq.patient,
          time: 'Just now',
          priority: newReq.priority || 'high'
        },
        ...prev
      ]);
      if (user?.role === 'pharmacy') {
        addToast(`🚨 URGENT: New emergency for ${newReq.medicine_name || newReq.medicine}!`, 'em');
      }
    });
    socket.on('emergency:update', ({ id, status, pharmacy_id, accepted_by }) => {
      setEmergencyRequests((prev) => prev.map((request) =>
        request.id === Number(id) ? { ...request, status, pharmacy_id: pharmacy_id || accepted_by, accepted_by: accepted_by || pharmacy_id } : request
      ));
    });
    socket.on('appointment:update', (updatedAppt) => {
      addToast(`Appointment status updated to ${updatedAppt.status}.`, 'info');
    });
    socket.on('order:new', () => addToast('New order received.', 'ok'));
    socket.on('stock:update', ({ pharmacy_id, medicine_id, quantity }) => {
      setStock((prev) => ({
        ...prev,
        [pharmacy_id]: { ...(prev[pharmacy_id] || {}), [medicine_id]: quantity },
      }));
    });

    return () => {
      socket.off('new-emergency-request');
      socket.off('emergency:update');
      socket.off('appointment:update');
      socket.off('order:new');
      socket.off('stock:update');
    };
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => undefined
    );

    const bootstrap = async () => {
      try {
        setLoading(true);
        const [meds, pharms, docs, rawStock] = await Promise.all([
          api.getMedicines(),
          api.getPharmacies(),
          api.getDoctors(),
          api.getStock(),
        ]);

        const normalizedStock = {};
        (Array.isArray(rawStock) ? rawStock : []).forEach((item) => {
          if (!normalizedStock[item.pharmacy_id]) normalizedStock[item.pharmacy_id] = {};
          normalizedStock[item.pharmacy_id][item.medicine_id] = item.quantity;
        });

        setMedicines(Array.isArray(meds) ? meds : []);
        setPharmacies(Array.isArray(pharms) ? pharms : []);
        setDoctors(Array.isArray(docs) ? docs : []);
        setStock(normalizedStock);
        setUser((current) => normalizeUser(current, Array.isArray(docs) ? docs : []));
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const fetchRequests = () => {
      api.getEmergencies().then((data) => {
        const formatted = (Array.isArray(data) ? data : []).map((request) => ({
          id: request.id,
          medicine: request.medicine,
          patient: request.patient || 'System Request',
          status: request.status,
          pharmacy_id: request.pharmacy_id,
          time: request.created_at ? new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          priority: request.priority || 'high',
        }));
        setEmergencyRequests(formatted);
      }).catch(console.error);
    };

    fetchRequests();
    const intervalId = setInterval(fetchRequests, 5000);
    return () => clearInterval(intervalId);
  }, []);

  function addToast(msg, type = 'info') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  }

  const handleLogin = async (loggedInUser) => {
    const finalUser = normalizeUser(loggedInUser, doctors);
    localStorage.setItem('user', JSON.stringify(finalUser));
    setUser(finalUser);

    const signupKey = `hasSignedUp_${finalUser.email}`;
    if (!localStorage.getItem(signupKey)) {
      localStorage.setItem(signupKey, 'true');
      try {
        await fetch('https://careconnect-rjfs.onrender.com/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: finalUser.email,
            subject: 'Welcome to CareConnect',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #0d9488; padding: 20px; color: white; text-align: center;"><h1 style="margin: 0; font-size: 24px;">Welcome to CareConnect</h1></div>
                <div style="padding: 30px;"><p>Hi <strong>${finalUser.username}</strong>,</p><p>Your account is now active as a <strong>${finalUser.role}</strong>.</p></div>
              </div>`,
          }),
        });
      } catch {
        // Ignore email failures during login flow.
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setPage('dashboard');
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--navy)', color: 'white' }}>Authorized Access...</div>;
  }

  if (error) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: '#7f1d1d', color: 'white', padding: 20 }}>{error}</div>;
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} addToast={addToast} pharmacies={pharmacies} doctors={doctors} />
        <Toast toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
      </>
    );
  }

  const pendingCount = emergencyRequests.filter((request) => request.status === 'pending').length;
  let navItems = [];
  if (user.role === 'user') {
    navItems = [
      { id: 'search', label: 'Medicine Search', icon: icons.search },
      { id: 'cart', label: 'My Cart', icon: icons.cart, badge: cart.length || null },
      { id: 'map', label: 'Pharmacy Map', icon: icons.map },
      { id: 'appointment', label: 'Book Appointment', icon: icons.plus },
      { id: 'prescription', label: 'Medical Upload', icon: icons.camera },
      { id: 'chatbot', label: 'CareBot Assistant', icon: icons.sparkle },
    ];
  } else if (user.role === 'pharmacy') {
    navItems = [
      { id: 'pharmacydash', label: 'Pharmacy Dashboard', icon: icons.pharmacy },
      { id: 'emergency', label: 'Emergency Orders', icon: icons.alert, badge: pendingCount || null },
    ];
  } else {
    navItems = [
      { id: 'doctordash', label: 'Appointments', icon: icons.dashboard },
      { id: 'doc_schedule', label: 'Schedule Manager', icon: icons.history },
      { id: 'doc_consultation', label: 'Consultation', icon: icons.camera },
      { id: 'doc_prescription', label: 'Prescription Pad', icon: icons.pill[0] },
      { id: 'doc_profile', label: 'My Profile', icon: icons.sparkle },
    ];
  }

  const pageTitle = navItems.find((item) => item.id === page)?.label ?? 'CareConnect';

  return (
    <>
      <div className="app">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon"><Icon d={icons.pill[0]} size={20} stroke="white" /></div>
              <div>
                <div className="logo-text">CareConnect</div>
                <div className="logo-sub">Pharmacy Management System</div>
              </div>
            </div>
            <div style={{ marginTop: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="avatar" style={{
                  background: user.role === 'pharmacy' ? 'var(--teal)' : user.role === 'doctor' ? 'var(--blue)' : 'var(--navy-light)',
                  width: 36,
                  height: 36,
                  fontSize: 16,
                  fontWeight: 700
                }}>
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user.username}</div>
                  <div style={{ color: 'var(--muted-light)', fontSize: 11 }}>{user.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="tag rx" style={{ fontSize: 9, display: 'inline-block' }}>{user.role.toUpperCase()}</div>
                {user.role === 'pharmacy' && pharmacies.find(p => p.id === user.pharmacyId) && (
                  <div style={{ color: 'var(--teal)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon d={icons.map} size={10} /> {pharmacies.find(p => p.id === user.pharmacyId)?.area}
                  </div>
                )}
              </div>
            </div>
          </div>
          <nav className="nav">
            <div className="nav-section">
              <div className="nav-label" style={{ color: 'var(--muted-light)' }}>Main Menu</div>
              {navItems.map((item) => (
                <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
                  <Icon d={item.icon} size={17} />
                  {item.label}
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer">
            {user.role === 'user' && (
              <div className="emergency-badge" onClick={() => { setPage('emergency'); addToast('Emergency system activated!', 'em'); }}>
                <span className="pulse">LIVE</span> Trigger Emergency
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--muted-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>v1.0.0  Bengaluru</span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--muted-light)', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Logout</button>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <button className="btn btn-outline" style={{ padding: '6px 10px', display: 'none' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Icon d={icons.menu} size={18} />
            </button>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-pill">Authorized Access</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleLogout}>Log Out</button>
            </div>
          </div>

          <div className="content">
            {page === 'dashboard' && <Dashboard medicines={medicines} pharmacies={pharmacies} stock={stock} emergencyRequests={emergencyRequests} addToast={addToast} />}
            {page === 'search' && <MedicineSearch medicines={medicines} pharmacies={pharmacies} stock={stock} addToast={addToast} query={searchQuery} setQuery={setSearchQuery} cart={cart} setCart={setCart} />}
            {page === 'cart' && <CartView user={user} cart={cart} setCart={setCart} setPage={setPage} addToast={addToast} />}
            {page === 'checkout' && <Checkout user={user} cart={cart} setCart={setCart} addToast={addToast} setPage={setPage} />}
            {page === 'map' && <PharmacyMap pharmacies={pharmacies} stock={stock} medicines={medicines} userLocation={userLocation} />}
            {page === 'emergency' && <EmergencySystem pharmacies={pharmacies} emergencyRequests={emergencyRequests} addToast={addToast} user={user} />}
            {page === 'prescription' && <MedicalUpload user={user} addToast={addToast} setQuery={setSearchQuery} setPage={setPage} socket={socket} />}
            {page === 'pharmacydash' && <PharmacyDashboard user={user} medicines={medicines} pharmacies={pharmacies} stock={stock} setStock={setStock} addToast={addToast} emergencyRequests={emergencyRequests} />}
            {page === 'chatbot' && <Chatbot user={user} setQuery={setSearchQuery} setPage={setPage} addToast={addToast} />}
            {page === 'appointment' && <BookAppointment user={user} doctors={doctors} addToast={addToast} />}
            {['doctordash', 'doc_schedule', 'doc_consultation', 'doc_prescription', 'doc_profile'].includes(page) && (
              <DoctorDashboard user={user} medicines={medicines} doctors={doctors} setDoctors={setDoctors} addToast={addToast} activeTab={page === 'doctordash' ? 'appointments' : page.replace('doc_', '')} />
            )}
          </div>
          <footer style={{
            padding: '20px 0',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 12,
            borderTop: '1px solid var(--border)',
            marginTop: 'auto'
          }}>
            CareConnect © 2026 | Healthcare & Pharmacy Management System
          </footer>
        </main>
      </div>
      <Toast toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </>
  );
}
