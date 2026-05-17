import { useState, useEffect, useRef, useCallback } from "react";

// ─── DUMMY DATA ────────────────────────────────────────────────────────────────
const MEDICINES = [
  { id: "m1", name: "Paracetamol 500mg", salt: "Paracetamol", category: "Analgesic", price: 12, manufacturer: "Sun Pharma", requires_prescription: false },
  { id: "m2", name: "Dolo 650", salt: "Paracetamol", category: "Analgesic", price: 28, manufacturer: "Micro Labs", requires_prescription: false },
  { id: "m3", name: "Calpol 500mg", salt: "Paracetamol", category: "Analgesic", price: 22, manufacturer: "GSK", requires_prescription: false },
  { id: "m4", name: "Amoxicillin 500mg", salt: "Amoxicillin", category: "Antibiotic", price: 85, manufacturer: "Cipla", requires_prescription: true },
  { id: "m5", name: "Mox 500", salt: "Amoxicillin", category: "Antibiotic", price: 72, manufacturer: "Ranbaxy", requires_prescription: true },
  { id: "m6", name: "Novamox 500", salt: "Amoxicillin", category: "Antibiotic", price: 90, manufacturer: "Cipla", requires_prescription: true },
  { id: "m7", name: "Metformin 500mg", salt: "Metformin HCl", category: "Antidiabetic", price: 35, manufacturer: "USV", requires_prescription: true },
  { id: "m8", name: "Glycomet 500", salt: "Metformin HCl", category: "Antidiabetic", price: 42, manufacturer: "USV", requires_prescription: true },
  { id: "m9", name: "Azithromycin 500mg", salt: "Azithromycin", category: "Antibiotic", price: 120, manufacturer: "Pfizer", requires_prescription: true },
  { id: "m10", name: "Zithromax 500", salt: "Azithromycin", category: "Antibiotic", price: 135, manufacturer: "Pfizer", requires_prescription: true },
  { id: "m11", name: "Omeprazole 20mg", salt: "Omeprazole", category: "Antacid", price: 55, manufacturer: "AstraZeneca", requires_prescription: false },
  { id: "m12", name: "Omez 20", salt: "Omeprazole", category: "Antacid", price: 48, manufacturer: "Dr. Reddy's", requires_prescription: false },
  { id: "m13", name: "Atorvastatin 10mg", salt: "Atorvastatin", category: "Statin", price: 65, manufacturer: "Pfizer", requires_prescription: true },
  { id: "m14", name: "Lipitor 10mg", salt: "Atorvastatin", category: "Statin", price: 80, manufacturer: "Pfizer", requires_prescription: true },
  { id: "m15", name: "Ibuprofen 400mg", salt: "Ibuprofen", category: "NSAID", price: 18, manufacturer: "Abbott", requires_prescription: false },
  { id: "m16", name: "Brufen 400", salt: "Ibuprofen", category: "NSAID", price: 25, manufacturer: "Abbott", requires_prescription: false },
  { id: "m17", name: "Cetirizine 10mg", salt: "Cetirizine HCl", category: "Antihistamine", price: 15, manufacturer: "Sun Pharma", requires_prescription: false },
  { id: "m18", name: "Zyrtec 10mg", salt: "Cetirizine HCl", category: "Antihistamine", price: 32, manufacturer: "J&J", requires_prescription: false },
  { id: "m19", name: "Pantoprazole 40mg", salt: "Pantoprazole", category: "PPI", price: 72, manufacturer: "Wyeth", requires_prescription: true },
  { id: "m20", name: "Pan 40", salt: "Pantoprazole", category: "PPI", price: 58, manufacturer: "Alkem", requires_prescription: false },
];

const PHARMACIES = [
  { id: "p1", name: "MedPlus Pharmacy", area: "Koramangala", lat: 12.9352, lng: 77.6245, phone: "+91-80-4567-8901", rating: 4.5, hours: "8AM-10PM", emergency: true },
  { id: "p2", name: "Apollo Pharmacy", area: "Indiranagar", lat: 12.9784, lng: 77.6408, phone: "+91-80-2234-5678", rating: 4.8, hours: "24/7", emergency: true },
  { id: "p3", name: "Fortis HealthWorld", area: "Whitefield", lat: 12.9698, lng: 77.7499, phone: "+91-80-3345-6789", rating: 4.3, hours: "9AM-9PM", emergency: false },
  { id: "p4", name: "Netmeds Store", area: "HSR Layout", lat: 12.9116, lng: 77.6474, phone: "+91-80-4456-7890", rating: 4.6, hours: "8AM-11PM", emergency: true },
  { id: "p5", name: "PharmEasy Hub", area: "Marathahalli", lat: 12.9591, lng: 77.6974, phone: "+91-80-5567-8901", rating: 4.2, hours: "7AM-11PM", emergency: false },
  { id: "p6", name: "Guardian Pharmacy", area: "JP Nagar", lat: 12.9102, lng: 77.5920, phone: "+91-80-6678-9012", rating: 4.4, hours: "9AM-9PM", emergency: false },
];

// Stock: pharmacyId -> medicineId -> qty
const INITIAL_STOCK = {
  p1: { m1: 50, m2: 30, m4: 15, m7: 20, m11: 40, m15: 60, m17: 35 },
  p2: { m1: 80, m3: 25, m5: 18, m8: 30, m9: 12, m12: 45, m13: 8, m15: 70, m18: 40, m19: 15 },
  p3: { m2: 20, m6: 10, m7: 25, m10: 5, m14: 6, m16: 55, m20: 35 },
  p4: { m1: 60, m4: 22, m9: 8, m11: 30, m15: 45, m17: 50, m19: 20 },
  p5: { m3: 15, m5: 12, m8: 18, m12: 28, m16: 40, m18: 25, m20: 30 },
  p6: { m2: 35, m7: 15, m11: 22, m13: 10, m15: 50, m17: 28 },
};

const EMERGENCY_REQUESTS = [
  { id: "er1", medicine: "Epinephrine 1mg", patient: "Rahul S.", status: "pending", time: "2 min ago", priority: "critical" },
  { id: "er2", medicine: "Insulin Glargine", patient: "Priya M.", status: "dispatched", time: "15 min ago", priority: "high" },
  { id: "er3", medicine: "Salbutamol Inhaler", patient: "Arun K.", status: "fulfilled", time: "1 hr ago", priority: "high" },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  pill: ["M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5z", "M10.5 3.75a6.75 6.75 0 1 0 0 13.5"],
  map: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  x: "M18 6L6 18 M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  plus: "M12 5v14 M5 12h14",
  truck: ["M1 3h15v13H1z", "M16 8h4l3 3v5h-7V8z", "M5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  pharmacy: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  sparkle: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  close: "M18 6L6 18 M6 6l12 12",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --teal: #0d9488;
    --teal-light: #14b8a6;
    --teal-dark: #0f766e;
    --mint: #ccfbf1;
    --cream: #fefce8;
    --navy: #0f172a;
    --slate: #334155;
    --muted: #94a3b8;
    --surface: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --red: #ef4444;
    --red-light: #fee2e2;
    --amber: #f59e0b;
    --amber-light: #fef3c7;
    --green: #22c55e;
    --green-light: #dcfce7;
    --blue: #3b82f6;
    --blue-light: #dbeafe;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 4px 24px rgba(15,23,42,0.08);
    --shadow-lg: 0 8px 40px rgba(15,23,42,0.14);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--navy); min-height: 100vh; }

  .app { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar {
    width: 260px; background: var(--navy); min-height: 100vh; position: fixed; left: 0; top: 0;
    display: flex; flex-direction: column; z-index: 100; transition: transform .3s ease;
  }
  .sidebar-logo {
    padding: 28px 24px 20px; border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .logo-mark {
    display: flex; align-items: center; gap: 10px;
  }
  .logo-icon {
    width: 38px; height: 38px; background: var(--teal); border-radius: 10px;
    display: grid; place-items: center; color: white;
  }
  .logo-text { font-family: 'Fraunces', serif; font-size: 22px; color: white; font-weight: 700; letter-spacing: -0.5px; }
  .logo-sub { font-size: 11px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }

  .nav { padding: 16px 12px; flex: 1; }
  .nav-section { margin-bottom: 24px; }
  .nav-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); padding: 0 12px; margin-bottom: 6px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 10px;
    color: #94a3b8; cursor: pointer; transition: all .2s; font-size: 14px; font-weight: 500;
    margin-bottom: 2px; border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: rgba(255,255,255,.06); color: white; }
  .nav-item.active { background: var(--teal); color: white; }
  .nav-badge {
    margin-left: auto; background: var(--red); color: white; font-size: 10px;
    padding: 1px 6px; border-radius: 20px; font-weight: 600;
  }

  .sidebar-footer {
    padding: 16px 24px; border-top: 1px solid rgba(255,255,255,.08);
    font-size: 12px; color: var(--muted);
  }
  .emergency-badge {
    display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,.15);
    border: 1px solid rgba(239,68,68,.3); border-radius: 10px; padding: 10px 12px;
    color: #fca5a5; font-size: 12px; font-weight: 500; cursor: pointer; margin-bottom: 12px;
  }
  .pulse { animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }

  /* Main */
  .main { margin-left: 260px; flex: 1; }

  /* Topbar */
  .topbar {
    background: var(--card); border-bottom: 1px solid var(--border); padding: 0 32px;
    height: 64px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 50;
  }
  .topbar-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; color: var(--navy); flex: 1; }
  .topbar-pill {
    display: flex; align-items: center; gap: 6px; background: var(--mint); color: var(--teal-dark);
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  }
  .avatar {
    width: 36px; height: 36px; background: linear-gradient(135deg, var(--teal), var(--teal-dark));
    border-radius: 50%; display: grid; place-items: center; color: white; font-weight: 700; font-size: 14px;
  }

  /* Content */
  .content { padding: 32px; }

  /* Cards */
  .card {
    background: var(--card); border-radius: var(--radius); border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .card-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; }
  .card-body { padding: 24px; }

  /* Stats grid */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: var(--card); border-radius: var(--radius); border: 1px solid var(--border);
    padding: 20px; position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; right: 0; width: 80px; height: 80px;
    border-radius: 0 0 0 80px; opacity: .06;
  }
  .stat-card.teal::before { background: var(--teal); }
  .stat-card.red::before { background: var(--red); }
  .stat-card.amber::before { background: var(--amber); }
  .stat-card.blue::before { background: var(--blue); }
  .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 12px; }
  .stat-icon.teal { background: var(--mint); color: var(--teal-dark); }
  .stat-icon.red { background: var(--red-light); color: var(--red); }
  .stat-icon.amber { background: var(--amber-light); color: var(--amber); }
  .stat-icon.blue { background: var(--blue-light); color: var(--blue); }
  .stat-value { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 700; color: var(--navy); line-height: 1; }
  .stat-label { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .stat-change { font-size: 12px; margin-top: 8px; font-weight: 500; }
  .stat-change.up { color: var(--green); }
  .stat-change.warn { color: var(--amber); }

  /* Search */
  .search-wrap { position: relative; }
  .search-input {
    width: 100%; padding: 14px 48px 14px 48px; border: 2px solid var(--border); border-radius: var(--radius-sm);
    font-size: 15px; font-family: 'DM Sans', sans-serif; background: var(--card);
    color: var(--navy); transition: border .2s; outline: none;
  }
  .search-input:focus { border-color: var(--teal); }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--muted); }
  .search-clear { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--muted); cursor: pointer; border: none; background: none; }

  /* Medicine Cards */
  .med-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 20px; }
  .med-card {
    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px; transition: all .2s; cursor: pointer; position: relative; overflow: hidden;
  }
  .med-card:hover { border-color: var(--teal-light); box-shadow: 0 4px 20px rgba(13,148,136,.12); transform: translateY(-2px); }
  .med-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .med-name { font-weight: 600; font-size: 15px; color: var(--navy); }
  .med-salt { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .tag {
    display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  }
  .tag.rx { background: var(--amber-light); color: #92400e; }
  .tag.otc { background: var(--green-light); color: #166534; }
  .tag.cat { background: var(--blue-light); color: #1e40af; }
  .med-price { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: var(--teal-dark); }
  .med-price span { font-size: 12px; font-weight: 400; color: var(--muted); font-family: 'DM Sans', sans-serif; }
  .avail-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
  .avail-chip {
    font-size: 11px; padding: 3px 8px; border-radius: 6px; background: var(--mint); color: var(--teal-dark); font-weight: 500;
  }
  .avail-chip.none { background: var(--red-light); color: var(--red); }
  .alt-btn {
    margin-top: 14px; width: 100%; padding: 9px; border-radius: var(--radius-sm); border: 1.5px solid var(--teal);
    background: none; color: var(--teal); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .2s;
  }
  .alt-btn:hover { background: var(--teal); color: white; }

  /* Pharmacy table */
  .pharm-table { width: 100%; border-collapse: collapse; }
  .pharm-table th { padding: 12px 16px; text-align: left; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--border); }
  .pharm-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
  .pharm-table tr:last-child td { border-bottom: none; }
  .pharm-table tr:hover td { background: var(--surface); }
  .rating-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--amber-light); color: #92400e; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .em-badge { background: var(--red-light); color: var(--red); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .open-badge { background: var(--green-light); color: #166534; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }

  /* Map mockup */
  .map-container {
    height: 380px; background: linear-gradient(145deg, #e0f2fe 0%, #ccfbf1 100%);
    border-radius: var(--radius); border: 1px solid var(--border); position: relative; overflow: hidden;
  }
  .map-grid {
    position: absolute; inset: 0; opacity: .15;
    background-image: linear-gradient(var(--teal) 1px, transparent 1px), linear-gradient(90deg, var(--teal) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  .map-pin {
    position: absolute; transform: translate(-50%, -100%); cursor: pointer;
    transition: transform .2s;
  }
  .map-pin:hover { transform: translate(-50%, -100%) scale(1.2); }
  .pin-dot { width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: grid; place-items: center; }
  .pin-dot > * { transform: rotate(45deg); }
  .pin-dot.emergency { background: var(--red); box-shadow: 0 0 0 6px rgba(239,68,68,.2); animation: pinpulse 1.5s infinite; }
  .pin-dot.normal { background: var(--teal); }
  @keyframes pinpulse { 0%,100%{box-shadow:0 0 0 6px rgba(239,68,68,.2);} 50%{box-shadow:0 0 0 12px rgba(239,68,68,.05);} }
  .pin-label {
    position: absolute; top: -56px; left: 50%; transform: translateX(-50%) rotate(0);
    background: white; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600;
    white-space: nowrap; box-shadow: 0 2px 12px rgba(0,0,0,.15); color: var(--navy);
    opacity: 0; transition: opacity .2s; pointer-events: none;
  }
  .map-pin:hover .pin-label { opacity: 1; }
  .map-label { position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: var(--slate); }
  .map-label strong { display: block; font-size: 14px; color: var(--navy); margin-bottom: 4px; }

  /* Emergency */
  .em-card { border-radius: var(--radius); overflow: hidden; margin-bottom: 12px; }
  .em-card-inner { display: flex; align-items: center; gap: 16px; padding: 16px 20px; }
  .em-card.critical { background: #fff1f2; border: 1px solid #fecdd3; }
  .em-card.high { background: var(--amber-light); border: 1px solid #fde68a; }
  .em-card.fulfilled { background: var(--green-light); border: 1px solid #bbf7d0; }
  .priority-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .priority-dot.critical { background: var(--red); box-shadow: 0 0 0 4px rgba(239,68,68,.2); animation: pulse 1.5s infinite; }
  .priority-dot.high { background: var(--amber); }
  .priority-dot.fulfilled { background: var(--green); }
  .em-info { flex: 1; }
  .em-medicine { font-weight: 600; font-size: 14px; color: var(--navy); }
  .em-patient { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .em-time { font-size: 11px; color: var(--muted); }
  .em-status { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  .em-status.critical { background: var(--red); color: white; }
  .em-status.dispatched { background: var(--amber); color: white; }
  .em-status.fulfilled { background: var(--green); color: white; }
  .btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
    border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all .2s; border: none;
  }
  .btn-primary { background: var(--teal); color: white; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-danger { background: var(--red); color: white; }
  .btn-danger:hover { background: #dc2626; }
  .btn-outline { background: none; border: 1.5px solid var(--border); color: var(--slate); }
  .btn-outline:hover { border-color: var(--teal); color: var(--teal); }

  /* Upload */
  .upload-zone {
    border: 2px dashed var(--border); border-radius: var(--radius); padding: 48px 24px;
    text-align: center; transition: all .2s; cursor: pointer; background: var(--surface);
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--teal); background: var(--mint); }
  .upload-icon { width: 56px; height: 56px; background: var(--mint); border-radius: 50%; display: grid; place-items: center; color: var(--teal); margin: 0 auto 16px; }
  .upload-title { font-weight: 600; font-size: 16px; color: var(--navy); margin-bottom: 6px; }
  .upload-sub { font-size: 13px; color: var(--muted); }

  /* OCR result */
  .ocr-result { background: var(--navy); border-radius: var(--radius); padding: 20px; margin-top: 20px; }
  .ocr-label { font-size: 11px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  .ocr-medicines { display: flex; flex-wrap: wrap; gap: 8px; }
  .ocr-chip {
    background: rgba(20,184,166,.2); border: 1px solid rgba(20,184,166,.4);
    color: var(--teal-light); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
  }

  /* Dashboard stock */
  .stock-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .stock-row:last-child { border-bottom: none; }
  .stock-name { flex: 1; font-size: 14px; font-weight: 500; }
  .stock-bar-wrap { width: 120px; height: 6px; background: var(--border); border-radius: 10px; overflow: hidden; }
  .stock-bar { height: 100%; border-radius: 10px; transition: width .5s ease; }
  .stock-bar.good { background: var(--green); }
  .stock-bar.low { background: var(--amber); }
  .stock-bar.critical { background: var(--red); }
  .stock-qty { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: var(--navy); min-width: 36px; text-align: right; }
  .stock-input { width: 70px; padding: 6px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; text-align: center; font-family: 'DM Sans'; }
  .stock-input:focus { outline: none; border-color: var(--teal); }
  .update-btn { padding: 6px 14px; border-radius: 8px; background: var(--teal); color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
  .update-btn:hover { background: var(--teal-dark); }

  /* Alert toast */
  .toast-container { position: fixed; top: 80px; right: 24px; z-index: 999; display: flex; flex-direction: column; gap: 10px; }
  .toast {
    background: var(--navy); color: white; padding: 14px 18px; border-radius: var(--radius-sm);
    font-size: 13px; display: flex; align-items: center; gap: 10px; box-shadow: var(--shadow-lg);
    animation: slideIn .3s ease; max-width: 320px;
  }
  @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .toast.em { border-left: 4px solid var(--red); }
  .toast.ok { border-left: 4px solid var(--green); }
  .toast.info { border-left: 4px solid var(--teal); }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px);
    z-index: 200; display: grid; place-items: center; padding: 24px;
  }
  .modal { background: var(--card); border-radius: var(--radius); max-width: 520px; width: 100%; box-shadow: var(--shadow-lg); }
  .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-body { padding: 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

  /* Form */
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: var(--slate); margin-bottom: 8px; }
  .form-input {
    width: 100%; padding: 12px 16px; border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    font-size: 14px; font-family: 'DM Sans'; color: var(--navy); background: var(--card);
    transition: border .2s; outline: none;
  }
  .form-input:focus { border-color: var(--teal); }
  .form-select { appearance: none; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; background: var(--surface); border-radius: var(--radius-sm); padding: 4px; margin-bottom: 24px; }
  .tab { flex: 1; padding: 10px; border: none; background: none; border-radius: 8px; font-family: 'DM Sans'; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; transition: all .2s; }
  .tab.active { background: var(--card); color: var(--teal); box-shadow: var(--shadow); }

  /* Grid helpers */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .col-span-2 { grid-column: span 2; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .main { margin-left: 0; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .topbar { padding: 0 16px; }
    .content { padding: 16px; }
    .med-grid { grid-template-columns: 1fr; }
  }

  /* Empty */
  .empty { text-align: center; padding: 48px 24px; color: var(--muted); }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 15px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getAvailability(medicineId, stock) {
  return PHARMACIES.filter(p => (stock[p.id]?.[medicineId] ?? 0) > 0);
}
function getAlternatives(medicine) {
  return MEDICINES.filter(m => m.salt === medicine.salt && m.id !== medicine.id);
}
function getStockLevel(qty) {
  if (qty >= 30) return "good";
  if (qty >= 10) return "low";
  return "critical";
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <Icon d={t.type === "em" ? icons.alert : t.type === "ok" ? icons.check : icons.bell} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function AlternativesModal({ medicine, onClose }) {
  const alts = getAlternatives(medicine);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="card-title">Alternative Medicines</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Same salt: {medicine.salt}</div>
          </div>
          <button className="btn btn-outline" style={{ padding: "6px 10px" }} onClick={onClose}><Icon d={icons.x} size={16} /></button>
        </div>
        <div className="modal-body">
          {alts.length === 0 ? (
            <div className="empty"><div className="empty-text">No alternatives found</div></div>
          ) : alts.map(alt => (
            <div key={alt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{alt.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{alt.manufacturer} · <span className={`tag ${alt.requires_prescription ? "rx" : "otc"}`}>{alt.requires_prescription ? "Rx" : "OTC"}</span></div>
              </div>
              <div className="med-price">₹{alt.price} <span>/strip</span></div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function Dashboard({ stock, emergencyRequests, addToast }) {
  const totalMeds = MEDICINES.length;
  const totalPharm = PHARMACIES.length;
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
            {emergencyRequests.slice(0, 3).map(er => (
              <div key={er.id} className={`em-card ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} style={{ marginBottom: 10 }}>
                <div className="em-card-inner">
                  <div className={`priority-dot ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} />
                  <div className="em-info">
                    <div className="em-medicine">{er.medicine}</div>
                    <div className="em-patient">Patient: {er.patient} · {er.time}</div>
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
                {PHARMACIES.slice(0, 4).map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: "var(--muted)" }}>{p.area}</td>
                    <td><span className="rating-badge">⭐ {p.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => addToast("Emergency broadcast sent to all pharmacies!", "em")}><Icon d={icons.alert} size={16} />Broadcast Emergency</button>
          <button className="btn btn-outline" onClick={() => addToast("Stock sync initiated across all locations", "info")}><Icon d={icons.truck} size={16} />Sync Stock</button>
          <button className="btn btn-outline" onClick={() => addToast("Reports generated & ready to download", "ok")}><Icon d={icons.sparkle} size={16} />Generate Report</button>
        </div>
      </div>
    </div>
  );
}

function MedicineSearch({ stock, addToast }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [altModal, setAltModal] = useState(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }

    fetch(`https://careconnect-rjfs.onrender.com/api/medicines/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data))
      .catch(err => console.log(err));

  }, [query]);


  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="search-wrap">
            <span className="search-icon"><Icon d={icons.search} size={18} /></span>
            <input className="search-input" placeholder="Search medicines by name, salt, or category…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button className="search-clear" onClick={() => setQuery("")}><Icon d={icons.x} size={16} /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {["all", "otc", "rx"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className="btn" style={{ padding: "6px 16px", fontSize: 12, background: filter === f ? "var(--teal)" : "var(--surface)", color: filter === f ? "white" : "var(--slate)", border: "1.5px solid var(--border)" }}>
                {f === "all" ? "All Medicines" : f === "otc" ? "OTC Only" : "Rx Required"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>{results.length} medicines found</div>

      {results.length === 0 ? (
        <div className="empty"><div className="empty-icon">💊</div><div className="empty-text">No medicines found for "{query}"</div></div>
      ) : (
        <div className="med-grid">
          {results.map(med => {
            const available = getAvailability(med.id, stock);
            return (
              <div key={med.id} className="med-card">
                <div className="med-card-header">
                  <div>
                    <div className="med-name">{med.name}</div>
                    <div className="med-salt">{med.salt}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span className={`tag ${med.requires_prescription ? "rx" : "otc"}`}>{med.requires_prescription ? "Rx" : "OTC"}</span>
                    <span className="tag cat">{med.category}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="med-price">₹{med.price} <span>/strip</span></div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{med.manufacturer}</div>
                </div>
                <div className="avail-row">
                  {available.length === 0
                    ? <span className="avail-chip none">Not available</span>
                    : available.slice(0, 3).map(p => <span key={p.id} className="avail-chip">{p.area}</span>)
                  }
                  {available.length > 3 && <span className="avail-chip">+{available.length - 3} more</span>}
                </div>
                <button className="alt-btn" onClick={() => setAltModal(med)}>
                  <Icon d={icons.sparkle} size={14} /> View Alternatives
                </button>
              </div>
            );
          })}
        </div>
      )}
      {altModal && <AlternativesModal medicine={altModal} onClose={() => setAltModal(null)} />}
    </div>
  );
}

function PharmacyMap() {
  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Pharmacy Locations — Bengaluru</div><span className="open-badge">6 Active</span></div>
        <div className="card-body">
          <div className="map-container">
            <div className="map-grid" />
            {PHARMACIES.map((p, i) => {
              // Map lat/lng to % positions within the card (rough Bengaluru bbox)
              const x = ((p.lng - 77.57) / (77.77 - 77.57)) * 85 + 5;
              const y = ((12.99 - p.lat) / (12.99 - 12.89)) * 80 + 8;
              return (
                <div key={p.id} className="map-pin" style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="pin-label">{p.name}</div>
                  <div className={`pin-dot ${p.emergency ? "emergency" : "normal"}`}>
                    <Icon d={icons.pharmacy} size={14} stroke="white" />
                  </div>
                </div>
              );
            })}
            <div className="map-label">
              <strong>Legend</strong>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--red)", borderRadius: "50%", display: "inline-block" }} />Emergency 24/7</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--teal)", borderRadius: "50%", display: "inline-block" }} />Standard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Pharmacy Locations</div></div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="pharm-table">
            <thead>
              <tr><th>Pharmacy</th><th>Area</th><th>Phone</th><th>Hours</th><th>Rating</th><th>Emergency</th></tr>
            </thead>
            <tbody>
              {PHARMACIES.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.area}</td>
                  <td style={{ color: "var(--teal)", fontSize: 13 }}>{p.phone}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{p.hours}</td>
                  <td><span className="rating-badge">⭐ {p.rating}</span></td>
                  <td>{p.emergency ? <span className="em-badge">24/7</span> : <span style={{ color: "var(--muted)", fontSize: 12 }}>–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmergencySystem({ emergencyRequests, setEmergencyRequests, addToast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicine: "", patient: "", priority: "high", pharmacy: "" });

  function submitRequest() {
    if (!form.medicine || !form.patient) return;
    const req = {
      id: `er${Date.now()}`,
      medicine: form.medicine,
      patient: form.patient,
      status: "pending",
      time: "Just now",
      priority: form.priority,
    };
    setEmergencyRequests(prev => [req, ...prev]);
    addToast(`🚨 Emergency request sent for ${form.medicine}!`, "em");
    setForm({ medicine: "", patient: "", priority: "high", pharmacy: "" });
    setShowForm(false);
  }

  function updateStatus(id, status) {
    setEmergencyRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    addToast(`Request status updated to ${status}`, "ok");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn btn-danger" onClick={() => setShowForm(true)}>
          <Icon d={icons.alert} size={16} /> New Emergency Request
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: "2px solid var(--red)" }}>
          <div className="card-header" style={{ background: "var(--red-light)" }}>
            <div className="card-title" style={{ color: "var(--red)" }}>🚨 New Emergency Medicine Request</div>
            <button className="btn btn-outline" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon d={icons.x} size={16} /></button>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input className="form-input" placeholder="e.g. Epinephrine 1mg" value={form.medicine} onChange={e => setForm(f => ({ ...f, medicine: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input className="form-input" placeholder="Patient full name" value={form.patient} onChange={e => setForm(f => ({ ...f, patient: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select className="form-input form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Pharmacy</label>
                <select className="form-input form-select" value={form.pharmacy} onChange={e => setForm(f => ({ ...f, pharmacy: e.target.value }))}>
                  <option value="">Any available</option>
                  {PHARMACIES.filter(p => p.emergency).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-danger" onClick={submitRequest}><Icon d={icons.bell} size={16} />Send Emergency Alert</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Active Emergency Requests</div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{emergencyRequests.length} total</span>
        </div>
        <div className="card-body">
          {emergencyRequests.map(er => (
            <div key={er.id} className={`em-card ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} style={{ marginBottom: 10 }}>
              <div className="em-card-inner">
                <div className={`priority-dot ${er.status === "fulfilled" ? "fulfilled" : er.priority}`} />
                <div className="em-info">
                  <div className="em-medicine">{er.medicine}</div>
                  <div className="em-patient">Patient: {er.patient} · {er.time}</div>
                </div>
                <span className={`em-status ${er.status === "pending" ? "critical" : er.status === "dispatched" ? "dispatched" : "fulfilled"}`}>{er.status}</span>
                {er.status !== "fulfilled" && (
                  <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
                    {er.status === "pending" && <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => updateStatus(er.id, "dispatched")}>Dispatch</button>}
                    <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderColor: "var(--green)", color: "var(--green)" }} onClick={() => updateStatus(er.id, "fulfilled")}>Fulfill</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrescriptionUpload({ addToast }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState(null);
  const inputRef = useRef();

  const FAKE_OCR_RESULTS = ["Paracetamol 500mg", "Amoxicillin 500mg", "Omeprazole 20mg", "Cetirizine 10mg"];

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setExtractedMeds(null);
    setProcessing(true);
    addToast("Prescription uploaded, running OCR…", "info");
    setTimeout(() => {
      setProcessing(false);
      setExtractedMeds(FAKE_OCR_RESULTS.slice(0, Math.floor(Math.random() * 3) + 2));
      addToast("Medicines extracted from prescription!", "ok");
    }, 2200);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Upload Prescription</div></div>
        <div className="card-body">
          <div
            className={`upload-zone ${dragging ? "drag" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current.click()}
          >
            <div className="upload-icon"><Icon d={icons.upload} size={26} /></div>
            <div className="upload-title">{file ? file.name : "Drop prescription image here"}</div>
            <div className="upload-sub">{file ? "Click to replace" : "PNG, JPG, PDF up to 10MB"}</div>
            <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          {processing && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--teal)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🔍 Analyzing prescription…</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Running OCR engine · Extracting medicine names</div>
              <div style={{ marginTop: 16, height: 4, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--teal)", borderRadius: 10, animation: "progressBar 2.2s linear" }} />
              </div>
            </div>
          )}
          {extractedMeds && (
            <div className="ocr-result">
              <div className="ocr-label">✅ Medicines detected from prescription</div>
              <div className="ocr-medicines">
                {extractedMeds.map((m, i) => <span key={i} className="ocr-chip">{m}</span>)}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => addToast("Medicines added to your order list!", "ok")}>
                  <Icon d={icons.plus} size={14} />Add to Cart
                </button>
                <button className="btn btn-outline" style={{ fontSize: 13, color: "var(--teal-light)", borderColor: "var(--teal)" }} onClick={() => setExtractedMeds(null)}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">How It Works</div></div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { step: "01", title: "Upload Image", desc: "Take a photo or upload a scan of your prescription" },
              { step: "02", title: "OCR Processing", desc: "Our engine reads and extracts all medicine names" },
              { step: "03", title: "Smart Matching", desc: "Medicines are matched against our database" },
              { step: "04", title: "Find Availability", desc: "See which pharmacies have your medicines in stock" },
            ].map(s => (
              <div key={s.step} style={{ flex: "1 1 200px" }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 36, fontWeight: 700, color: "var(--mint)", lineHeight: 1 }}>{s.step}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PharmacyDashboard({ stock, setStock, addToast }) {
  const [selectedPharmacy, setSelectedPharmacy] = useState("p1");
  const [editQty, setEditQty] = useState({});
  const pharmacy = PHARMACIES.find(p => p.id === selectedPharmacy);
  const pharmStock = stock[selectedPharmacy] || {};

  function updateStock(medId) {
    const qty = parseInt(editQty[medId]);
    if (isNaN(qty) || qty < 0) return;
    setStock(prev => ({
      ...prev,
      [selectedPharmacy]: { ...prev[selectedPharmacy], [medId]: qty },
    }));
    setEditQty(prev => ({ ...prev, [medId]: "" }));
    addToast(`Stock updated for ${MEDICINES.find(m => m.id === medId)?.name}`, "ok");
  }

  const stockedMeds = MEDICINES.filter(m => pharmStock[m.id] !== undefined);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Select Pharmacy</div></div>
        <div className="card-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PHARMACIES.map(p => (
            <button key={p.id} onClick={() => setSelectedPharmacy(p.id)} className="btn" style={{ background: selectedPharmacy === p.id ? "var(--teal)" : "var(--surface)", color: selectedPharmacy === p.id ? "white" : "var(--slate)", border: "1.5px solid var(--border)" }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{pharmacy?.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{pharmacy?.area} · {pharmacy?.hours}</div>
          </div>
          {pharmacy?.emergency && <span className="em-badge">24/7 Emergency</span>}
        </div>
        <div className="card-body">
          {stockedMeds.map(med => {
            const qty = pharmStock[med.id] ?? 0;
            const level = getStockLevel(qty);
            const pct = Math.min((qty / 100) * 100, 100);
            return (
              <div key={med.id} className="stock-row">
                <div>
                  <div className="stock-name">{med.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{med.category}</div>
                </div>
                <div className="stock-bar-wrap"><div className={`stock-bar ${level}`} style={{ width: `${pct}%` }} /></div>
                <div className="stock-qty" style={{ color: level === "good" ? "var(--green)" : level === "low" ? "var(--amber)" : "var(--red)" }}>{qty}</div>
                <input className="stock-input" type="number" placeholder="New qty" value={editQty[med.id] ?? ""} onChange={e => setEditQty(prev => ({ ...prev, [med.id]: e.target.value }))} />
                <button className="update-btn" onClick={() => updateStock(med.id)}>Update</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function CareConnect() {
  const [page, setPage] = useState("dashboard");
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [emergencyRequests, setEmergencyRequests] = useState(EMERGENCY_REQUESTS);
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pendingCount = emergencyRequests.filter(e => e.status === "pending").length;

  function addToast(msg, type = "info") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  const navItems = [
    { id: "dashboard", label: "Overview", icon: icons.dashboard },
    { id: "search", label: "Medicine Search", icon: icons.search },
    { id: "map", label: "Pharmacy Map", icon: icons.map },
    { id: "emergency", label: "Emergency", icon: icons.alert, badge: pendingCount > 0 ? pendingCount : null },
    { id: "prescription", label: "Prescription OCR", icon: icons.camera },
    { id: "pharmacydash", label: "Pharmacy Dashboard", icon: icons.pharmacy },
  ];

  const pageTitle = navItems.find(n => n.id === page)?.label ?? "CareConnect";

  return (
    <>
      <style>{css}</style>
      <style>{`@keyframes progressBar { from{width:0%} to{width:100%} }`}</style>

      <div className="app">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon"><Icon d={icons.pill[0]} size={20} stroke="white" /></div>
              <div>
                <div className="logo-text">CareConnect</div>
                <div className="logo-sub">Healthcare Platform</div>
              </div>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-section">
              <div className="nav-label">Main Menu</div>
              {navItems.map(item => (
                <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
                  <Icon d={item.icon} size={17} />
                  {item.label}
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="emergency-badge" onClick={() => { setPage("emergency"); addToast("Emergency system activated!", "em"); }}>
              <span className="pulse">🔴</span> Emergency Hotline Active
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>v1.0.0 · Bengaluru, India</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main">
          <div className="topbar">
            <button className="btn btn-outline" style={{ padding: "6px 10px", display: "none" }} id="menuBtn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Icon d={icons.menu} size={18} />
            </button>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-pill"><Icon d={icons.sparkle} size={13} />AI-Powered</div>
            <div className="avatar">A</div>
          </div>

          <div className="content">
            {page === "dashboard" && <Dashboard stock={stock} emergencyRequests={emergencyRequests} addToast={addToast} />}
            {page === "search" && <MedicineSearch stock={stock} addToast={addToast} />}
            {page === "map" && <PharmacyMap />}
            {page === "emergency" && <EmergencySystem emergencyRequests={emergencyRequests} setEmergencyRequests={setEmergencyRequests} addToast={addToast} />}
            {page === "prescription" && <PrescriptionUpload addToast={addToast} />}
            {page === "pharmacydash" && <PharmacyDashboard stock={stock} setStock={setStock} addToast={addToast} />}
          </div>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );
}
