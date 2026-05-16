const BASE = 'http://127.0.0.1:5000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const handleResponse = (r) => 
  r.text().then(text => {
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { error: 'Invalid JSON response', details: text };
    }
    if (!r.ok && !data.error) {
      data.error = `Server error: ${r.status} ${r.statusText}`;
    }
    return data;
  });

export const api = {
  BASE,
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }) }).then(handleResponse),

  register: (data) =>
    fetch(`${BASE}/auth/register`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) }).then(handleResponse),

  getMedicines: () =>
    fetch(`${BASE}/medicines`).then(handleResponse),

  searchMedicines: (q) =>
    fetch(`${BASE}/medicines/search?q=${encodeURIComponent(q)}`).then(handleResponse),

  getAvailability: (id) =>
    fetch(`${BASE}/availability/${id}`).then(handleResponse),

  getDoctors: () =>
    fetch(`${BASE}/doctors`).then(handleResponse),

  updateProfile: (id, data) =>
    fetch(`${BASE}/doctors/${id}`, { method: 'PUT',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getSchedule: (doctorId) =>
    fetch(`${BASE}/doctor-schedule/${doctorId}`).then(handleResponse),

  updateSchedule: (doctorId, data) =>
    fetch(`${BASE}/doctor-schedule/${doctorId}`, { method: 'PUT',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getAppointments: (filters) =>
    fetch(`${BASE}/appointments?${new URLSearchParams(filters)}`,
      { headers: authHeaders() }).then(handleResponse),

  bookAppointment: (data) =>
    fetch(`${BASE}/appointments`, { method: 'POST',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  updateAppointment: (id, status) =>
    fetch(`${BASE}/appointments/${id}`, { method: 'PUT',
      headers: authHeaders(), body: JSON.stringify({ status }) }).then(handleResponse),

  getPharmacies: () =>
    fetch(`${BASE}/pharmacies`).then(handleResponse),

  getStock: () =>
    fetch(`${BASE}/stock`).then(handleResponse),

  updateStock: (data) =>
    fetch(`${BASE}/stock`, { method: 'PUT',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  createOrder: (data) =>
    fetch(`${BASE}/orders`, { method: 'POST',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getOrders: (pharmacyId) =>
    fetch(`${BASE}/orders${pharmacyId ? `?pharmacy_id=${pharmacyId}` : ''}`,
      { headers: authHeaders() }).then(handleResponse),

  reserve: (data) =>
    fetch(`${BASE}/reserve`, { method: 'POST',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getReservations: (pharmacyId) =>
    fetch(`${BASE}/reservations${pharmacyId ? `?pharmacy_id=${pharmacyId}` : ''}`,
      { headers: authHeaders() }).then(handleResponse),

  getEmergencies: () =>
    fetch(`${BASE}/emergency`, { headers: authHeaders() }).then(handleResponse),

  createEmergency: (data) =>
    fetch(`${BASE}/emergency`, { method: 'POST',
      headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  acceptEmergency: (id) =>
    fetch(`${BASE}/emergency/${id}/accept`, { method: 'PUT',
      headers: authHeaders() }).then(handleResponse),

  updateEmergency: (id, status, pharmacy_id) =>
    fetch(`${BASE}/emergency/${id}`, { method: 'PUT',
      headers: authHeaders(), body: JSON.stringify({ status, pharmacy_id }) }).then(handleResponse),

  uploadPrescription: (file) => {
    const form = new FormData();
    form.append('prescription', file);
    return fetch(`${BASE}/ocr/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: form,
    }).then(handleResponse);
  },

  createPrescription: (data) =>
    fetch(`${BASE}/prescriptions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getPrescriptions: (filters) =>
    fetch(`${BASE}/prescriptions?${new URLSearchParams(filters)}`, {
      headers: authHeaders(),
    }).then((r) => r.json()),
};

