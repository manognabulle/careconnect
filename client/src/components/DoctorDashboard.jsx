import React, { useEffect, useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';
import { generateTimeSlots } from './helpers';

export function DoctorDashboard({ user, medicines, doctors, setDoctors, addToast, activeTab }) {
  const inferredDoctor = doctors.find((doctor) => {
    const doctorName = doctor.name.toLowerCase().replace('dr. ', '').trim();
    const userName = (user.username || user.name || '').toLowerCase().replace('dr. ', '').trim();
    return doctor.id === user.doctorId || doctorName === userName || doctor.email?.toLowerCase() === user.email?.toLowerCase();
  });
  const doctorId = Number(user.doctorId || inferredDoctor?.id || 1);
  const [appointments, setAppointments] = useState([]);
  const [consulting, setConsulting] = useState(null);
  const [rxItems, setRxItems] = useState([]);
  const [currentRx, setCurrentRx] = useState({ med: '', dosage: '', freq: '', duration: '', timing: 'After Food' });
  const [suggestions, setSuggestions] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [view, setView] = useState(activeTab || 'appointments');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const myDoctorData = doctors.find((doctor) => Number(doctor.id) === doctorId) || { name: user.username, specialty: 'General Physician', fee: 500, bio: '' };
  const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' });
  const daySchedule = schedules[dayName] || { slots: generateTimeSlots(), blocked: [] };
  const doctorSlots = daySchedule.slots || generateTimeSlots();
  const blockedSlots = daySchedule.blocked || [];

  useEffect(() => {
    if (activeTab) setView(activeTab);
  }, [activeTab]);

  useEffect(() => {
    api.getAppointments({}).then((data) => {
      setAppointments((Array.isArray(data) ? data : []).filter((appointment) => Number(appointment.doctor_id) === doctorId));
    }).catch(console.error);
  }, [doctorId]);

  useEffect(() => {
    api.getSchedule(doctorId)
      .then((rows) => {
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          map[row.day] = { slots: row.slots || [], blocked: row.blocked_slots || [] };
        });
        setSchedules(map);
      })
      .catch(console.error);
  }, [doctorId]);

  const saveSchedule = async (day, slots, blocked) => {
    const data = await api.updateSchedule(doctorId, { day, slots, blocked_slots: blocked });
    if (data.error) {
      addToast(data.error, 'em');
      return;
    }
    setSchedules((prev) => ({ ...prev, [day]: { slots, blocked } }));
  };

  const updateStatus = async (appointmentId, status) => {
    const updated = await api.updateAppointment(appointmentId, status);
    if (updated.error) {
      addToast(updated.error, 'em');
      return;
    }
    setAppointments((prev) => prev.map((appointment) => appointment.id === updated.id ? { ...appointment, status: updated.status } : appointment));
    addToast(`Appointment ${status} successfully.`, 'ok');
  };

  const handleToggleSlot = async (slot) => {
    const nextBlocked = blockedSlots.includes(slot)
      ? blockedSlots.filter((blockedSlot) => blockedSlot !== slot)
      : [...blockedSlots, slot].sort();
    await saveSchedule(dayName, doctorSlots, nextBlocked);
  };

  const saveProfile = async () => {
    const res = await api.updateProfile(doctorId, { 
      specialty: myDoctorData.specialty, 
      fee: myDoctorData.fee, 
      phone: myDoctorData.phone, 
      bio: myDoctorData.bio,
      hospital: myDoctorData.hospital,
      consultation_mode: myDoctorData.consultation_mode
    });
    if (res.error) {
      addToast('Profile save failed', 'em');
      return;
    }
    addToast('Profile updated successfully.', 'ok');
  };

  const finalizePrescription = async () => {
    if (!consulting || rxItems.length === 0) return;
    
    const res = await api.createPrescription({
      doctor_id: doctorId,
      appointment_id: consulting.id,
      patient_name: consulting.patient_name,
      patient_email: consulting.patient_email,
      medicines: rxItems
    });

    if (res.error) {
      addToast('Unable to process prescription. Please try again.', 'em');
      return;
    }

    // Send Email
    try {
      const emailRes = await fetch(`${api.BASE.replace('/api', '')}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: consulting.patient_email,
          subject: `Prescription from ${myDoctorData.name}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #0d9488; padding: 20px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Digital Prescription</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">${myDoctorData.name} - ${myDoctorData.specialty}</p>
              </div>
              <div style="padding: 30px;">
                <p>Hi <strong>${consulting.patient_name}</strong>,</p>
                <p>Your prescription has been generated following your consultation on ${new Date(consulting.date).toLocaleDateString()}.</p>
                
                <div style="margin-top: 24px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8fafc;">
                      <tr>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #eee;">Medicine</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #eee;">Dosage</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #eee;">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rxItems.map(item => `
                        <tr>
                          <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${item.med}</strong><br><small style="color: #666;">${item.timing}</small></td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.dosage}</td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.freq} (${item.duration})</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                  Reg No: ${doctorId * 12345}<br>
                  Regards,<br>CareConnect Team
                </div>
              </div>
            </div>
          `
        })
      });
      const emailData = await emailRes.json();
      if (emailData.success) {
        addToast(`Prescription sent to ${consulting.patient_email}.`, 'ok');
      } else {
        addToast('Prescription saved, but email sending failed. Check your API key.', 'warn');
      }
    } catch (e) {
      addToast('Prescription saved, but failed to connect to email service.', 'warn');
    }

    addToast(`Prescription processed successfully for ${consulting.patient_name}.`, 'ok');
    setRxItems([]);
    setConsulting(null);
    setView('appointments');
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      {view === 'appointments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Patient Appointments</div>
            <span className="tag cat">{appointments.filter((appointment) => appointment.status === 'pending').length} Pending</span>
          </div>
          <div className="card-body">
            {appointments.length === 0 ? <div className="empty">No appointments scheduled</div> : appointments.map((appointment) => (
              <div key={appointment.id} className="stock-row" style={{ padding: '16px 20px', background: 'var(--surface)', borderRadius: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{appointment.patient_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{appointment.time}  {new Date(appointment.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  {appointment.reason && <div className="appt-reason">Reason: {appointment.reason}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`tag ${appointment.status === 'pending' ? 'rx' : appointment.status === 'confirmed' ? 'otc' : 'cat'}`} style={{ textTransform: 'uppercase' }}>{appointment.status}</span>
                  {appointment.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => updateStatus(appointment.id, 'confirmed')}>Accept</button>
                      <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => updateStatus(appointment.id, 'cancelled')}>Decline</button>
                    </div>
                  )}
                      {appointment.status === 'confirmed' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => { setConsulting(appointment); setView('consultation'); }}>Consult</button>
                          <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => updateStatus(appointment.id, 'completed')}>Mark Done</button>
                        </div>
                      )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'schedule' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Manage Availability</div></div>
          <div className="card-body">
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--mint)', borderRadius: 10, fontSize: 13, color: 'var(--teal-dark)' }}>
              Select a date and click time slots to block or unblock them for that day of the week.
            </div>
            <div className="form-group" style={{ maxWidth: 300, marginBottom: 24 }}>
              <label className="form-label">Select Date to Manage</label>
              <input type="date" className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 12, fontSize: 15 }}>Slots for {dayName}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {doctorSlots.map((slot) => {
                  const blocked = blockedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      className="btn"
                      style={{ 
                        fontSize: 12, 
                        padding: '10px 18px', 
                        background: blocked ? 'white' : 'var(--teal)', 
                        color: blocked ? 'black' : 'white', 
                        border: blocked ? '2px solid var(--border)' : 'none',
                        fontWeight: 600,
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onClick={() => handleToggleSlot(slot)}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'consultation' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Active Consultation</div></div>
          <div className="card-body">
            {consulting ? (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 30 }}>
                <div style={{ borderRight: '1px solid var(--border)', paddingRight: 30 }}>
                  <div className="avatar" style={{ width: 100, height: 100, fontSize: 40, margin: '0 auto 20px' }}>{consulting.patient_name.charAt(0)}</div>
                  <h2 style={{ textAlign: 'center', marginBottom: 10 }}>{consulting.patient_name}</h2>
                  <div className="tag cat" style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}>{consulting.type.toUpperCase()}</div>
                  <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>
                    <strong>Reason for visit:</strong><br/>
                    {consulting.reason || 'Not specified'}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setView('prescription')}>Go to Prescription Pad</button>
                </div>
                <div>
                  <h3>Patient History (OCR Records)</h3>
                  <div className="empty" style={{ padding: 40, background: 'var(--surface)' }}>
                    No previous medical records found for this patient.
                  </div>
                  {consulting.type === 'online' && (
                    <div style={{ marginTop: 30, padding: 20, background: 'var(--mint)', borderRadius: 12 }}>
                      <h4>Video Consultation</h4>
                      <p style={{ fontSize: 13 }}>Click below to start the video call with the patient.</p>
                      <a href={`https://meet.jit.si/CareConnect-${consulting.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>Start Video Call</a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty">
                <p>No active consultation. Choose a patient from Appointments to begin.</p>
                <button className="btn btn-outline" onClick={() => setView('appointments')}>View Appointments</button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'prescription' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Digital Prescription Pad</div></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Select Patient</label>
              <select className="form-input form-select" value={consulting?.id || ''} onChange={(e) => setConsulting(appointments.find((appointment) => appointment.id === parseInt(e.target.value, 10)) || null)}>
                <option value="">-- Choose Patient --</option>
                {appointments.filter((appointment) => appointment.status === 'confirmed').map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>{appointment.patient_name} ({new Date(appointment.date).toLocaleDateString()})</option>
                ))}
              </select>
            </div>

            {consulting ? (
              <>
                <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 12, marginBottom: 24, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="form-label">Search Medicine</label>
                      <div className="search-wrap">
                        <Icon d={icons.search} size={16} className="search-icon" />
                        <input className="form-input" style={{ paddingLeft: 40 }} placeholder="Start typing medicine..." value={currentRx.med} onChange={(e) => {
                          const value = e.target.value;
                          setCurrentRx({ ...currentRx, med: value });
                          setSuggestions(value.length > 1 ? medicines.filter((medicine) => medicine.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5) : []);
                        }} />
                      </div>
                      {suggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 12, zIndex: 10, boxShadow: 'var(--shadow-lg)', marginTop: 4, overflow: 'hidden' }}>
                          {suggestions.map((suggestion) => (
                            <div key={suggestion.id} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--surface)' }} onClick={() => { setCurrentRx({ ...currentRx, med: suggestion.name }); setSuggestions([]); }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{suggestion.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{suggestion.category}  {suggestion.salt}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="form-group"><label className="form-label">Dosage</label><input className="form-input" placeholder="e.g. 500mg" value={currentRx.dosage} onChange={(e) => setCurrentRx({ ...currentRx, dosage: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Frequency</label><input className="form-input" placeholder="e.g. 1-0-1" value={currentRx.freq} onChange={(e) => setCurrentRx({ ...currentRx, freq: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Duration</label><input className="form-input" placeholder="e.g. 5 days" value={currentRx.duration} onChange={(e) => setCurrentRx({ ...currentRx, duration: e.target.value })} /></div>
                    <div className="form-group">
                      <label className="form-label">Timing</label>
                      <select className="form-input form-select" value={currentRx.timing} onChange={(e) => setCurrentRx({ ...currentRx, timing: e.target.value })}>
                        <option value="Before Food">Before Food</option>
                        <option value="After Food">After Food</option>
                        <option value="With Food">With Food</option>
                        <option value="Empty Stomach">Empty Stomach</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 10, padding: 12 }} onClick={() => {
                    if (currentRx.med) {
                      setRxItems([...rxItems, currentRx]);
                      setCurrentRx({ med: '', dosage: '', freq: '', duration: '', timing: 'After Food' });
                    }
                  }}>Add Medicine to Prescription</button>
                </div>

                <div className="card" style={{ boxShadow: 'none', border: '1.5px dashed var(--border)' }}>
                  <div className="card-header" style={{ background: 'none' }}><div className="card-title" style={{ fontSize: 16 }}>Prescription Items</div></div>
                  <div className="card-body">
                    {rxItems.length === 0 ? <div className="empty" style={{ padding: 20 }}>No medicines added yet</div> : rxItems.map((item, index) => (
                      <div key={`${item.med}-${index}`} className="rx-item" style={{ background: 'var(--mint)', border: 'none', marginBottom: 10, padding: '14px 20px', borderRadius: 12, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--teal-dark)', fontSize: 15 }}>{item.med} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--slate)' }}>({item.dosage})</span></div>
                          <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 12 }}><span><b>Freq:</b> {item.freq}</span><span><b>Duration:</b> {item.duration}</span><span><b>Timing:</b> {item.timing}</span></div>
                        </div>
                        <button className="btn" style={{ color: 'var(--red)', background: 'white', padding: '6px 12px', fontSize: 12, borderRadius: 8 }} onClick={() => setRxItems(rxItems.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                      </div>
                    ))}
                    {rxItems.length > 0 && (
                      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                        <button className="btn btn-primary" style={{ flex: 1, padding: 14 }} onClick={finalizePrescription}>Finalize & Send to Patient</button>
                        <button className="btn btn-outline" style={{ padding: 14 }} onClick={() => setRxItems([])}>Clear All</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty" style={{ padding: 60 }}>
                <div className="empty-text">No patient selected. Please choose a confirmed patient to start writing a prescription.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'profile' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header"><div className="card-title">Profile Settings</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 20, marginBottom: 30, alignItems: 'center' }}>
              <div className="avatar" style={{ width: 80, height: 80, fontSize: 32 }}>{user.username.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{user.username}</div>
                <div style={{ color: 'var(--muted)' }}>{user.email}</div>
                <span className="tag cat" style={{ marginTop: 8 }}>{myDoctorData.specialty}</span>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Specialization</label><input className="form-input" value={myDoctorData.specialty || ''} onChange={(e) => setDoctors(doctors.map((doctor) => Number(doctor.id) === doctorId ? { ...doctor, specialty: e.target.value } : doctor))} /></div>
              <div className="form-group"><label className="form-label">Consultation Fee (Rs)</label><input className="form-input" type="number" value={myDoctorData.fee || 0} onChange={(e) => setDoctors(doctors.map((doctor) => Number(doctor.id) === doctorId ? { ...doctor, fee: parseInt(e.target.value, 10) || 0 } : doctor))} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Hospital / Clinic</label><input className="form-input" value={myDoctorData.hospital || ''} onChange={(e) => setDoctors(doctors.map((doctor) => Number(doctor.id) === doctorId ? { ...doctor, hospital: e.target.value } : doctor))} /></div>
              <div className="form-group">
                <label className="form-label">Consultation Mode</label>
                <select className="form-input form-select" value={myDoctorData.consultation_mode || 'both'} onChange={(e) => setDoctors(doctors.map((doctor) => Number(doctor.id) === doctorId ? { ...doctor, consultation_mode: e.target.value } : doctor))}>
                  <option value="online">Video Call Only</option>
                  <option value="offline">In-Person Only</option>
                  <option value="both">Both (Online & Offline)</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Bio / Experience Summary</label><textarea className="form-input" style={{ height: 120 }} value={myDoctorData.bio || ''} onChange={(e) => setDoctors(doctors.map((doctor) => Number(doctor.id) === doctorId ? { ...doctor, bio: e.target.value } : doctor))} /></div>
            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={saveProfile}>Save Profile Details</button>
          </div>
        </div>
      )}
    </div>
  );
}
