import React, { useState, useEffect } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

const MED_CATEGORIES = [
  'Analgesic', 'Antibiotic', 'Antidiabetic', 'Antacid', 'NSAID', 'Antihistamine', 'Antihypertensive', 'Asthma', 'Steroid', 'Antiepileptic',
  'Liver Care', 'Kidney Care', 'Laxative', 'Cough Syrup', 'Hormone', 'Cardiac', 'Vitamin Supplement', 'Skin Care', 'Eye Drops', 'ENT',
  'Pediatric', 'Emergency Medicine', 'Gastrointestinal', 'Neurology', 'Psychiatry', 'Orthopedic', 'Oncology', 'Gynecology', 'Dental', 'Fever & Cold'
];

export function MedicineSearch({ medicines, pharmacies, stock, addToast, query, setQuery, cart, setCart }) {
  const [filter, setFilter] = useState('');
  const filtered = medicines.filter((medicine) => {
    const searchTerms = query.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
    if (searchTerms.length === 0) return filter === '' || medicine.category === filter;
    
    const matchesSearch = searchTerms.some(term => 
      medicine.name.toLowerCase().includes(term) || 
      medicine.salt.toLowerCase().includes(term) || 
      medicine.category.toLowerCase().includes(term)
    );
    
    return matchesSearch && (filter === '' || medicine.category === filter);
  });

  const [isListening, setIsListening] = useState(false);

  const searchMedicine = (text) => {
    setQuery(text);
    addToast(`Searching for: ${text}`, 'ok');
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('Speech recognition not supported in this browser. Please use Chrome or Edge.', 'em');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      addToast('Voice recognition active...', 'info');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      searchMedicine(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      addToast(`Error: ${event.error}`, 'em');
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  async function reserveMedicine(medicine, pharmacyId, pharmacyName) {
    addToast(`Processing reservation for ${medicine.name}...`, 'info');
    const data = await api.reserve({ medicine_id: medicine.id, pharmacy_id: pharmacyId, quantity: 1 });
    if (data.error) {
      addToast(data.error, 'em');
      return;
    }
    addToast(`Medicine reserved successfully at ${pharmacyName}.`, 'ok');
  }

  const addToCart = (medicine, pharmacyId, pharmacyName) => {
    const existing = cart.find((item) => item.id === medicine.id && item.pharmacy_id === pharmacyId);
    if (existing) {
      setCart(cart.map((item) => item.id === medicine.id && item.pharmacy_id === pharmacyId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      const quantity = stock[pharmacyId]?.[medicine.id] || 0;
      setCart([...cart, { ...medicine, qty: 1, pharmacy_id: pharmacyId, pharmacyName, available_qty: quantity }]);
    }
    addToast(`${medicine.name} added to cart successfully.`, 'ok');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Icon d={icons.search} className="search-icon" size={18} />
          <input className="search-input" placeholder="Search by medicine, salt, or category..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button 
            onClick={startVoiceSearch} 
            className={`btn-icon ${isListening ? 'pulse-listening' : ''}`}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: isListening ? 'var(--red)' : 'var(--teal)', cursor: 'pointer' }}
            title="Voice Search"
          >
            <Icon d={icons.mic || "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 19v4 M8 23h8"} size={18} />
          </button>
        </div>
        <select className="form-input" style={{ width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Categories</option>
          {MED_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      <div className="med-grid">
        {filtered.map((medicine) => (
          <div key={medicine.id} className="card med-card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{medicine.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{medicine.salt}</div>
                  <span className="tag rx" style={{ fontSize: 10 }}>{medicine.category}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal)' }}>Rs {medicine.price}</div>
                  {medicine.requires_prescription && <div style={{ fontSize: 9, color: 'var(--red)', fontWeight: 700, marginTop: 4 }}>Rx Required</div>}
                </div>
              </div>
              <p style={{ fontSize: 13, margin: '16px 0', color: 'var(--slate)', minHeight: 40 }}>{medicine.description}</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Available at:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pharmacies.map((pharmacy) => {
                    const quantity = stock[pharmacy.id]?.[medicine.id] || 0;
                    if (quantity === 0) return null;
                    return (
                      <div key={pharmacy.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{pharmacy.name}</div>
                          <div style={{ color: 'var(--green)', fontSize: 11 }}>{quantity} units</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline" style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => reserveMedicine(medicine, pharmacy.id, pharmacy.name)}>Reserve</button>
                          <button className="btn btn-primary" style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => addToCart(medicine, pharmacy.id, pharmacy.name)}>Add to Cart</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
