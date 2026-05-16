import React, { useEffect, useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function BookAppointment({ user, doctors, addToast }) {
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [reason, setReason] = useState('');
  const [consultType, setConsultType] = useState('offline');
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingDoctor, setViewingDoctor] = useState(null);
  const [payingFor, setPayingFor] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState({});
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    api.getAppointments({}).then((data) => setAppointments(Array.isArray(data) ? data : [])).catch(console.error);
    
    const fetchSchedules = async () => {
      const scheduleMap = {};
      await Promise.all(doctors.map(async (doc) => {
        try {
          const res = await api.getSchedule(doc.id);
          scheduleMap[doc.id] = res;
        } catch (e) {
          scheduleMap[doc.id] = [];
        }
      }));
      setDoctorSchedules(scheduleMap);
    };
    if (doctors.length > 0) fetchSchedules();
  }, [doctors]);

  const loadAvailableSlots = async (doctorId, date) => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const [scheduleRes, bookedRes] = await Promise.all([
      api.getSchedule(doctorId),
      api.getAppointments({ doctor_id: doctorId, date }),
    ]);
    const daySchedule = (Array.isArray(scheduleRes) ? scheduleRes : []).find((schedule) => schedule.day === dayName);
    if (!daySchedule) return setAvailableSlots([]);
    const bookedTimes = new Set((Array.isArray(bookedRes) ? bookedRes : []).map((appointment) => appointment.time));
    const blocked = new Set(daySchedule.blocked_slots || []);
    
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    
    const available = (daySchedule.slots || []).filter((slot) => {
      if (bookedTimes.has(slot) || blocked.has(slot)) return false;
      if (isToday) {
        const [time, period] = slot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        return slotTime > now;
      }
      return true;
    });
    setAvailableSlots(available);
  };

  useEffect(() => {
    if (viewingDoctor && selectedDate) loadAvailableSlots(viewingDoctor.id, selectedDate).catch(() => setAvailableSlots([]));
    else setAvailableSlots([]);
  }, [viewingDoctor, selectedDate]);

  const specialties = ['All', ...new Set(doctors.map((doctor) => doctor.specialty))];
  const hospitals = ['All', ...new Set(doctors.map((doctor) => doctor.hospital).filter(Boolean))];
  
  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty = specialtyFilter === 'All' || doctor.specialty === specialtyFilter;
    const matchesHospital = hospitalFilter === 'All' || doctor.hospital === hospitalFilter;
    const matchesMode = modeFilter === 'All' || 
                       (modeFilter === 'online' && (doctor.consultation_mode === 'online' || doctor.consultation_mode === 'both')) ||
                       (modeFilter === 'offline' && (doctor.consultation_mode === 'offline' || doctor.consultation_mode === 'both'));
    
    const matchesFee = feeFilter === 'All' || 
                      (feeFilter === 'low' && doctor.fee <= 500) ||
                      (feeFilter === 'mid' && doctor.fee > 500 && doctor.fee <= 1000) ||
                      (feeFilter === 'high' && doctor.fee > 1000);

    let matchesAvailability = true;
    if (showAvailableOnly) {
      const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' });
      const docSchedule = doctorSchedules[doctor.id] || [];
      const daySchedule = docSchedule.find(s => s.day === dayName);
      matchesAvailability = daySchedule && (daySchedule.slots || []).length > 0;
    }

    return matchesSearch && matchesSpecialty && matchesHospital && matchesMode && matchesFee && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'exp') return b.experience - a.experience;
    if (sortBy === 'fee') return a.fee - b.fee;
    return 0;
  });

  const bookSlot = async (doctor, time) => {
    if (!reason.trim()) return addToast('Please provide a reason for consultation.', 'warn');
    setIsBooking(true);
    const data = await api.bookAppointment({
      patient_name: user.username,
      patient_email: user.email,
      doctor_id: doctor.id,
      date: selectedDate,
      time,
      reason,
      type: consultType,
      payment_status: consultType === 'online' ? 'paid' : 'pending'
    });
    setIsBooking(false);
    if (data.error || data.errors) return addToast("Unable to book appointment. Please try again.", 'em');
    setAppointments((prev) => [data, ...prev]);
    addToast('Appointment booked successfully.', 'ok');
    setViewingDoctor(null);
    setPayingFor(null);
    setReason('');
  };

  const handleSlotSelection = (doctor, time) => {
    if (consultType === 'online') {
      setPayingFor({ doctor, time });
    } else {
      bookSlot(doctor, time);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title" style={{ fontSize: '24px' }}>Medical Specialists</div>
          <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '14px' }}>Schedule your consultation with qualified healthcare professionals.</p>
        </div>
        <div className="topbar-pill">
          {filteredDoctors.length} Specialists Online
        </div>
      </div>
      
      <div className="card-body">
        {/* Modern Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px', padding: '20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search Doctor</label>
            <div className="search-wrap">
              <Icon d={icons.search} size={16} className="search-icon" />
              <input className="search-input" style={{ paddingLeft: '44px' }} placeholder="Name or specialty..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
            <select className="form-input form-select" value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
              {specialties.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hospital</label>
            <select className="form-input form-select" value={hospitalFilter} onChange={(e) => setHospitalFilter(e.target.value)}>
              {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fee Range</label>
            <select className="form-input form-select" value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)}>
              <option value="All">All Ranges</option>
              <option value="low">Budget (Up to ₹500)</option>
              <option value="mid">Standard (₹500 - ₹1000)</option>
              <option value="high">Premium (Above ₹1000)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consultation Date</label>
            <input type="date" className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '22px', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowAvailableOnly(!showAvailableOnly)}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--teal)', background: showAvailableOnly ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showAvailableOnly && <Icon d={icons.check} size={10} stroke="white" />}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Available Only</span>
            </div>
          </div>
        </div>

        {/* Doctor Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="med-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <img src={doctor.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=0d9488&color=fff`} alt={doctor.name} style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--navy)' }}>{doctor.name}</div>
                    <div className="rating-badge" style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '11px' }}>
                      <Icon d={icons.sparkle} size={10} /> {parseFloat(doctor.rating).toFixed(1)}
                    </div>
                  </div>
                  <div className="tag cat" style={{ marginTop: '6px', display: 'inline-block' }}>{doctor.specialty}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Hospital</div>
                  <div style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doctor.hospital || 'CareConnect Clinic'}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Experience</div>
                  <div style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: '600' }}>{doctor.experience} Years</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Fee</div>
                  <div className="med-price" style={{ fontSize: '20px', color: 'var(--teal)' }}>₹{doctor.fee}</div>
                </div>
                <button className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }} onClick={() => setViewingDoctor(doctor)}>
                   Book / Consult
                </button>
              </div>
            </div>
          ))}
        </div>

        {appointments.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="card-title" style={{ marginBottom: 20, fontSize: '20px' }}>Upcoming Consultations</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {appointments.filter(a => a.status !== 'cancelled').map((appointment) => (
                <div key={appointment.id} className="med-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{appointment.doctor_name || 'Specialist'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon d={icons.history} size={13} />
                      {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`tag ${appointment.status === 'pending' ? 'rx' : appointment.status === 'confirmed' ? 'otc' : 'cat'}`} style={{ marginBottom: '8px', display: 'inline-block' }}>{appointment.status.toUpperCase()}</span>
                    {appointment.status === 'confirmed' && appointment.type === 'online' && (
                      <div>
                        <a href={`https://meet.jit.si/CareConnect-${appointment.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', textDecoration: 'none' }}>
                          Join Call
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {viewingDoctor && (
        <div className="modal-overlay" onClick={() => setViewingDoctor(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title">Appointment Details</div>
              <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setViewingDoctor(null)}><Icon d={icons.x} size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                <img src={viewingDoctor.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingDoctor.name)}&background=0d9488&color=fff`} alt={viewingDoctor.name} style={{ width: '96px', height: '96px', borderRadius: '16px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: '28px', color: 'var(--navy)', marginBottom: '4px' }}>{viewingDoctor.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tag rx">{viewingDoctor.specialty}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>• {viewingDoctor.hospital}</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', color: 'var(--muted)', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icon d={icons.sparkle} size={14} style={{ color: 'var(--teal)' }} /> {viewingDoctor.rating} Rating</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icon d={icons.history} size={14} /> {viewingDoctor.experience} Years</span>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Reason for Visit</label>
                <textarea className="form-input" style={{ height: '90px' }} placeholder="Briefly describe your symptoms or reason for visit..." value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Consultation Type</label>
                  <div className="tabs">
                    {(viewingDoctor.consultation_mode === 'offline' || viewingDoctor.consultation_mode === 'both') && (
                      <button className={`tab ${consultType === 'offline' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setConsultType('offline')}>In-Person</button>
                    )}
                    {(viewingDoctor.consultation_mode === 'online' || viewingDoctor.consultation_mode === 'both') && (
                      <button className={`tab ${consultType === 'online' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setConsultType('online')}>Video Consultation</button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Time Slot</label>
                  {availableSlots.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--red)', padding: '10px', background: 'var(--red-light)', borderRadius: '10px', textAlign: 'center' }}>No slots on this date</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                      {availableSlots.map((slot) => (
                        <button 
                          key={slot} 
                          className="btn btn-outline" 
                          style={{ padding: '8px', fontSize: '12px' }}
                          onClick={() => handleSlotSelection(viewingDoctor, slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ marginRight: 'auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Consultation Fee</div>
                <div className="med-price" style={{ fontSize: '24px' }}>₹{viewingDoctor.fee}</div>
              </div>
              <button className="btn btn-outline" style={{ padding: '12px 24px' }} onClick={() => setViewingDoctor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingFor && (
        <div className="modal-overlay" onClick={() => setPayingFor(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--mint)', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <Icon d={icons.check} size={32} style={{ color: 'var(--teal)' }} />
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>Checkout Summary</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginTop: '8px' }}>{payingFor.doctor.name}</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--teal)', margin: '20px 0' }}>₹{payingFor.doctor.fee}</div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <button className="btn btn-primary" style={{ padding: '14px', borderRadius: '12px', justifyContent: 'center' }} onClick={() => bookSlot(payingFor.doctor, payingFor.time)} disabled={isBooking}>
                  {isBooking ? 'Booking Appointment...' : 'Confirm & Pay Securely'}
                </button>
                <button className="btn btn-outline" style={{ padding: '14px', borderRadius: '12px', justifyContent: 'center' }} onClick={() => setPayingFor(null)}>
                  Cancel Transaction
                </button>
              </div>
              <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                Secure Payment Gateway
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
