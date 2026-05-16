import React, { useRef, useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function MedicalUpload({ user, addToast, setQuery, setPage, socket }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [type, setType] = useState('prescription');
  const [detectedMeds, setDetectedMeds] = useState([]);
  const [labBooking, setLabBooking] = useState({ test: 'Complete Blood Count', time: '09:00 AM' });
  const inputRef = useRef(null);

  const handleOCR = async (selectedFile) => {
    setProcessing(true);
    const response = await api.uploadPrescription(selectedFile);
    if (response.error || !response.id) {
      setProcessing(false);
      addToast(response.error || 'Upload failed', 'em');
      return;
    }

    const { id } = response;
    socket.once('ocr:complete', (data) => {
      if (data.id === id) {
        setDetectedMeds(data.medicines || []);
        setProcessing(false);
        addToast(`Extracted ${(data.medicines || []).length} medicines`, 'ok');
      }
    });
    socket.once('ocr:error', (data) => {
      if (data.id === id) {
        setProcessing(false);
        addToast(data.error || 'OCR failed', 'em');
      }
    });
  };

  async function handleFile(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setDetectedMeds([]);
    addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} processed successfully.`, 'info');

    if (type === 'prescription') {
      await handleOCR(selectedFile);
      return;
    }

    setProcessing(false);
    addToast(type === 'report' ? 'Report uploaded successfully' : 'Upload complete', 'ok');
  }

  const bookLabTest = () => {
    const tests = JSON.parse(localStorage.getItem('lab_bookings') || '[]');
    tests.push({ ...labBooking, id: Date.now(), patientName: user.username, date: 'Tomorrow', status: 'confirmed' });
    localStorage.setItem('lab_bookings', JSON.stringify(tests));
    addToast(`${labBooking.test} booked for ${labBooking.time}`, 'ok');
    setType('prescription');
  };

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${type === 'prescription' ? 'active' : ''}`} onClick={() => setType('prescription')}>Prescription OCR</button>
        <button className={`tab ${type === 'report' ? 'active' : ''}`} onClick={() => setType('report')}>Medical Report</button>
        <button className={`tab ${type === 'lab' ? 'active' : ''}`} onClick={() => setType('lab')}>Book Blood Test</button>
      </div>

      {type === 'lab' ? (
        <div className="card">
          <div className="card-header"><div className="card-title">Book Laboratory Test</div></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Select Test</label>
              <select className="form-input" value={labBooking.test} onChange={(e) => setLabBooking({ ...labBooking, test: e.target.value })}>
                <option>Complete Blood Count (CBC)</option>
                <option>Blood Sugar (Fasting)</option>
                <option>Lipid Profile</option>
                <option>Thyroid Profile (T3, T4, TSH)</option>
                <option>Liver Function Test (LFT)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Slot (Tomorrow)</label>
              <select className="form-input" value={labBooking.time} onChange={(e) => setLabBooking({ ...labBooking, time: e.target.value })}>
                <option>08:00 AM</option>
                <option>09:00 AM</option>
                <option>10:00 AM</option>
                <option>11:00 AM</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={bookLabTest}>Confirm Booking</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Upload {type.charAt(0).toUpperCase() + type.slice(1)}</div></div>
          <div className="card-body">
            <div className={`upload-zone ${dragging ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
            >
              <div className="upload-icon"><Icon d={icons.upload} size={26} /></div>
              <div className="upload-title">{processing ? 'Uploading...' : file ? file.name : `Upload ${type.charAt(0).toUpperCase() + type.slice(1)}`}</div>

              <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>

            {processing && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--teal)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Analyzing {type}...</div>
                <div style={{ marginTop: 16, height: 4, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 10, animation: 'progressBar 2.2s linear' }} />
                </div>
              </div>
            )}

            {detectedMeds.length > 0 && (
              <div className="ocr-result" style={{ background: 'var(--navy)', color: 'white' }}>
                <div className="ocr-label" style={{ color: 'var(--mint)', marginBottom: 12 }}>Extracted Medical Data</div>
                <div style={{ fontSize: 12, marginBottom: 16, opacity: 0.8 }}>We've matched the following medicines from your prescription with our database:</div>
                <div className="ocr-medicines" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detectedMeds.map((med, index) => (
                    <div key={index} className="ocr-item" style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '10px 15px', 
                      borderRadius: 8,
                      border: `1px solid ${med.confidence === 'High' ? 'var(--teal)' : med.confidence === 'Medium' ? '#f59e0b' : '#ef4444'}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mint)' }}>{med.matched !== 'No close match found' ? med.matched : med.extracted}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>Extracted: {med.extracted}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          background: med.confidence === 'High' ? 'rgba(20, 184, 166, 0.2)' : med.confidence === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: med.confidence === 'High' ? 'var(--teal)' : med.confidence === 'Medium' ? '#f59e0b' : '#ef4444',
                          border: `1px solid ${med.confidence === 'High' ? 'var(--teal)' : med.confidence === 'Medium' ? '#f59e0b' : '#ef4444'}`
                        }}>{med.confidence} Match</span>
                        
                        <span style={{ fontSize: 12, color: med.available ? 'var(--mint)' : '#ef4444' }}>
                          {med.available ? 'In Stock' : 'Out of Stock'}
                        </span>

                        <Icon d={icons.close || "M18 6L6 18M6 6l12 12"} size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={(e) => {
                          e.stopPropagation();
                          setDetectedMeds(prev => prev.filter((_, i) => i !== index));
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                   <button className="btn btn-primary" style={{ background: 'var(--mint)', color: 'var(--navy)' }} onClick={() => { 
                     const q = detectedMeds.map(m => m.matched !== 'No close match found' ? m.matched : m.extracted).join(', ');
                     setQuery(q); 
                     setPage('search');
                     addToast(`Searching for ${detectedMeds.length} medicines...`, 'info');
                   }}><Icon d={icons.search} size={16} /> Reserve & Buy All</button>
                   <button className="btn btn-outline" style={{ borderColor: 'var(--teal)', color: 'var(--mint)' }} onClick={() => setPage('appointment')}><Icon d={icons.plus} size={16} /> Consultation</button>
                </div>
              </div>
            )}

            {!processing && file && type === 'prescription' && detectedMeds.length === 0 && (
              <div className="ocr-result" style={{ background: 'var(--navy)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="ocr-label" style={{ color: '#ef4444' }}>No Matches Found</div>
                <div style={{ color: 'white', fontSize: 14, marginBottom: 16, opacity: 0.8 }}>
                  Unable to automatically identify medicine names from this image.
                  <br /><br />
                  <span style={{ fontSize: 12 }}>Tip: Ensure the handwriting is clear and the lighting is good.</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={() => { setQuery(''); setPage('search'); }}><Icon d={icons.search} size={16} /> Manual Search</button>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--teal)', color: 'var(--mint)' }} onClick={() => setPage('appointment')}><Icon d={icons.plus} size={16} /> Book Consultation</button>
                </div>
              </div>
            )}

            {type === 'report' && file && !processing && (
              <div className="ocr-result">
                <div className="ocr-label">Upload Complete</div>
                <div style={{ color: 'white', fontSize: 14, marginBottom: 16 }}>Your report is available in the system. You can now book a specialist consultation.</div>
                <button className="btn btn-primary" onClick={() => setPage('appointment')}><Icon d={icons.plus} size={16} /> Book Specialist Consultation</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
