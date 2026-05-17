# CareConnect — Full Stack Healthcare Application
## Backend: Node.js + Express + MongoDB

---

## 📁 Folder Structure

```
careconnect/
├── client/                        # React frontend (CareConnect.jsx → src/App.jsx)
│   ├── public/
│   └── src/
│       ├── App.jsx                # Main app (the .jsx file provided)
│       └── index.jsx
│
├── server/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   │
│   ├── models/
│   │   ├── Medicine.js
│   │   ├── Pharmacy.js
│   │   ├── Stock.js
│   │   ├── EmergencyRequest.js
│   │   └── Prescription.js
│   │
│   ├── routes/
│   │   ├── medicines.js
│   │   ├── pharmacies.js
│   │   ├── stock.js
│   │   ├── emergency.js
│   │   └── prescriptions.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js              # Multer config for prescription images
│   │
│   ├── utils/
│   │   └── ocr.js                 # Tesseract.js OCR helper
│   │
│   ├── seed/
│   │   └── seedData.js            # Dummy data seeder
│   │
│   └── index.js                   # Express entry point
│
├── .env
├── package.json
└── README.md
```

---

## 📦 package.json (server)

```json
{
  "name": "careconnect-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "seed": "node server/seed/seedData.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "tesseract.js": "^5.0.4",
    "socket.io": "^4.6.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## ⚙️ .env

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/careconnect
JWT_SECRET=careconnect_super_secret_key
NODE_ENV=development
```

---

## 🔌 server/config/db.js

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 🗃️ MODELS

### server/models/Medicine.js
```javascript
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  salt: { type: String, required: true },           // Active ingredient
  category: { type: String, required: true },
  manufacturer: { type: String },
  price: { type: Number, required: true },
  requires_prescription: { type: Boolean, default: false },
  description: String,
  side_effects: [String],
  dosage: String,
  imageUrl: String,
}, { timestamps: true });

// Index for search
medicineSchema.index({ name: 'text', salt: 'text', category: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
```

### server/models/Pharmacy.js
```javascript
const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: String,
  address: String,
  phone: String,
  hours: String,
  rating: { type: Number, default: 0, min: 0, max: 5 },
  emergency: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number]   // [longitude, latitude]
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Geospatial index
pharmacySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
```

### server/models/Stock.js
```javascript
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, default: 0, min: 0 },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: String,
}, { timestamps: true });

stockSchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
```

### server/models/EmergencyRequest.js
```javascript
const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  patient: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  priority: { type: String, enum: ['critical', 'high', 'medium'], default: 'high' },
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
  contactPhone: String,
  notes: String,
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('EmergencyRequest', emergencySchema);
```

### server/models/Prescription.js
```javascript
const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: String,
  mimeType: String,
  size: Number,
  path: String,
  extractedMedicines: [String],   // OCR result
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
```

---

## 🛣️ ROUTES

### server/routes/medicines.js
```javascript
const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const Stock = require('../models/Stock');

// GET /api/medicines — search with query, category, rx filter
router.get('/', async (req, res) => {
  try {
    const { q, category, rx, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (rx === 'true') filter.requires_prescription = true;
    if (rx === 'false') filter.requires_prescription = false;

    const medicines = await Medicine.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Medicine.countDocuments(filter);
    res.json({ medicines, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/:id — single medicine + availability
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

    // Get pharmacies where this medicine is in stock
    const stockEntries = await Stock.find({
      medicine: medicine._id,
      quantity: { $gt: 0 }
    }).populate('pharmacy');

    res.json({ medicine, availability: stockEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/:id/alternatives — same salt
router.get('/:id/alternatives', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ error: 'Not found' });

    const alternatives = await Medicine.find({
      salt: medicine.salt,
      _id: { $ne: medicine._id }
    });

    res.json(alternatives);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### server/routes/pharmacies.js
```javascript
const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy');

// GET /api/pharmacies — list all or nearby (lat, lng, radius in km)
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 10, emergency } = req.query;
    let filter = { isActive: true };
    if (emergency === 'true') filter.emergency = true;

    let pharmacies;
    if (lat && lng) {
      pharmacies = await Pharmacy.find({
        ...filter,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: radius * 1000,
          }
        }
      });
    } else {
      pharmacies = await Pharmacy.find(filter);
    }

    res.json(pharmacies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacies/:id
router.get('/:id', async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id);
    if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });
    res.json(pharmacy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### server/routes/stock.js
```javascript
const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { body, validationResult } = require('express-validator');

// GET /api/stock/:pharmacyId — all stock for a pharmacy
router.get('/:pharmacyId', async (req, res) => {
  try {
    const stock = await Stock.find({ pharmacy: req.params.pharmacyId })
      .populate('medicine', 'name salt category price requires_prescription');
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stock/:pharmacyId/:medicineId — update quantity
router.put('/:pharmacyId/:medicineId',
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { pharmacyId, medicineId } = req.params;
      const { quantity, updatedBy } = req.body;

      const stock = await Stock.findOneAndUpdate(
        { pharmacy: pharmacyId, medicine: medicineId },
        { quantity, lastUpdated: new Date(), updatedBy },
        { upsert: true, new: true }
      ).populate('medicine pharmacy');

      // Emit real-time update via Socket.IO (see index.js)
      req.io?.emit('stockUpdate', {
        pharmacyId,
        medicineId,
        quantity,
        pharmacy: stock.pharmacy?.name,
        medicine: stock.medicine?.name,
      });

      res.json(stock);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
```

### server/routes/emergency.js
```javascript
const express = require('express');
const router = express.Router();
const EmergencyRequest = require('../models/EmergencyRequest');

// GET /api/emergency — list requests (optional ?status=pending)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await EmergencyRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('pharmacy', 'name area phone');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emergency — create new emergency request
router.post('/', async (req, res) => {
  try {
    const request = await EmergencyRequest.create(req.body);

    // Broadcast alert via Socket.IO
    req.io?.emit('emergencyAlert', {
      id: request._id,
      medicine: request.medicine,
      patient: request.patient,
      priority: request.priority,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/emergency/:id/status — update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'fulfilled') update.resolvedAt = new Date();

    const request = await EmergencyRequest.findByIdAndUpdate(
      req.params.id, update, { new: true }
    );

    req.io?.emit('emergencyStatusUpdate', { id: req.params.id, status });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### server/routes/prescriptions.js
```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Prescription = require('../models/Prescription');
const path = require('path');
const fs = require('fs');

const upload = multer({
  dest: 'uploads/prescriptions/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    cb(null, allowed.test(file.mimetype));
  }
});

// POST /api/prescriptions/upload — upload + OCR
router.post('/upload', upload.single('prescription'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const prescription = await Prescription.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    status: 'processing',
  });

  // Run OCR asynchronously
  Tesseract.recognize(req.file.path, 'eng')
    .then(({ data: { text } }) => {
      // Extract medicine-like words (capitalized, 3+ chars, possibly with mg/ml)
      const words = text.match(/\b[A-Z][a-z]+(?:\s+\d+\s*(?:mg|ml|mcg|g))?\b/g) || [];
      const unique = [...new Set(words)];

      prescription.extractedMedicines = unique;
      prescription.status = 'completed';
      prescription.save();
    })
    .catch(() => {
      prescription.status = 'failed';
      prescription.save();
    });

  res.status(202).json({
    id: prescription._id,
    message: 'Prescription uploaded, OCR in progress',
    status: 'processing',
  });
});

// GET /api/prescriptions/:id — get result
router.get('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Not found' });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 🚀 server/index.js

```javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Connect DB
connectDB();

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach socket.io to requests
app.use((req, res, next) => { req.io = io; next(); });

// Static uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/medicines',     require('./routes/medicines'));
app.use('/api/pharmacies',    require('./routes/pharmacies'));
app.use('/api/stock',         require('./routes/stock'));
app.use('/api/emergency',     require('./routes/emergency'));
app.use('/api/prescriptions', require('./routes/prescriptions'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Socket.IO
io.on('connection', socket => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 CareConnect API running on port ${PORT}`));
```

---

## 🌱 server/seed/seedData.js

```javascript
require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const Stock = require('../models/Stock');

const medicines = [
  { name: 'Paracetamol 500mg', salt: 'Paracetamol', category: 'Analgesic', price: 12, manufacturer: 'Sun Pharma', requires_prescription: false },
  { name: 'Dolo 650', salt: 'Paracetamol', category: 'Analgesic', price: 28, manufacturer: 'Micro Labs', requires_prescription: false },
  { name: 'Amoxicillin 500mg', salt: 'Amoxicillin', category: 'Antibiotic', price: 85, manufacturer: 'Cipla', requires_prescription: true },
  { name: 'Mox 500', salt: 'Amoxicillin', category: 'Antibiotic', price: 72, manufacturer: 'Ranbaxy', requires_prescription: true },
  { name: 'Metformin 500mg', salt: 'Metformin HCl', category: 'Antidiabetic', price: 35, manufacturer: 'USV', requires_prescription: true },
  { name: 'Omeprazole 20mg', salt: 'Omeprazole', category: 'Antacid', price: 55, manufacturer: 'AstraZeneca', requires_prescription: false },
  { name: 'Ibuprofen 400mg', salt: 'Ibuprofen', category: 'NSAID', price: 18, manufacturer: 'Abbott', requires_prescription: false },
  { name: 'Azithromycin 500mg', salt: 'Azithromycin', category: 'Antibiotic', price: 120, manufacturer: 'Pfizer', requires_prescription: true },
  { name: 'Cetirizine 10mg', salt: 'Cetirizine HCl', category: 'Antihistamine', price: 15, manufacturer: 'Sun Pharma', requires_prescription: false },
  { name: 'Atorvastatin 10mg', salt: 'Atorvastatin', category: 'Statin', price: 65, manufacturer: 'Pfizer', requires_prescription: true },
];

const pharmacies = [
  { name: 'MedPlus Pharmacy', area: 'Koramangala', phone: '+91-80-4567-8901', rating: 4.5, hours: '8AM-10PM', emergency: true, location: { type: 'Point', coordinates: [77.6245, 12.9352] } },
  { name: 'Apollo Pharmacy', area: 'Indiranagar', phone: '+91-80-2234-5678', rating: 4.8, hours: '24/7', emergency: true, location: { type: 'Point', coordinates: [77.6408, 12.9784] } },
  { name: 'Fortis HealthWorld', area: 'Whitefield', phone: '+91-80-3345-6789', rating: 4.3, hours: '9AM-9PM', emergency: false, location: { type: 'Point', coordinates: [77.7499, 12.9698] } },
  { name: 'Netmeds Store', area: 'HSR Layout', phone: '+91-80-4456-7890', rating: 4.6, hours: '8AM-11PM', emergency: true, location: { type: 'Point', coordinates: [77.6474, 12.9116] } },
];

async function seed() {
  await connectDB();
  await Medicine.deleteMany({});
  await Pharmacy.deleteMany({});
  await Stock.deleteMany({});

  const meds = await Medicine.insertMany(medicines);
  const pharms = await Pharmacy.insertMany(pharmacies);

  // Create random stock
  const stockData = [];
  for (const pharm of pharms) {
    for (const med of meds) {
      if (Math.random() > 0.4) {
        stockData.push({ pharmacy: pharm._id, medicine: med._id, quantity: Math.floor(Math.random() * 100) });
      }
    }
  }
  await Stock.insertMany(stockData);

  console.log(`✅ Seeded ${meds.length} medicines, ${pharms.length} pharmacies, ${stockData.length} stock entries`);
  mongoose.disconnect();
}

seed().catch(console.error);
```

---

## 🖥️ Frontend API Integration (add to React app)

```javascript
// src/api.js
const BASE ='https://careconnect-rjfs.onrender.com/api';

export const api = {
  getMedicines: (params) => fetch(`${BASE}/medicines?${new URLSearchParams(params)}`).then(r => r.json()),
  getAlternatives: (id) => fetch(`${BASE}/medicines/${id}/alternatives`).then(r => r.json()),
  getPharmacies: (params) => fetch(`${BASE}/pharmacies?${new URLSearchParams(params)}`).then(r => r.json()),
  getStock: (pharmacyId) => fetch(`${BASE}/stock/${pharmacyId}`).then(r => r.json()),
  updateStock: (pharmacyId, medicineId, quantity) =>
    fetch(`${BASE}/stock/${pharmacyId}/${medicineId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    }).then(r => r.json()),
  getEmergencies: (status) => fetch(`${BASE}/emergency${status ? `?status=${status}` : ''}`).then(r => r.json()),
  createEmergency: (data) => fetch(`${BASE}/emergency`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateEmergencyStatus: (id, status) => fetch(`${BASE}/emergency/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
  uploadPrescription: (file) => {
    const form = new FormData();
    form.append('prescription', file);
    return fetch(`${BASE}/prescriptions/upload`, { method: 'POST', body: form }).then(r => r.json());
  },
  getPrescription: (id) => fetch(`${BASE}/prescriptions/${id}`).then(r => r.json()),
};

// Socket.IO real-time events
// import { io } from 'socket.io-client';
// const socket = io('http://localhost:5000');
// socket.on('emergencyAlert', (data) => { /* show toast */ });
// socket.on('stockUpdate', (data) => { /* refresh stock */ });
```

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone <repo>
cd careconnect
npm install            # install server deps
cd client && npm install  # install React deps

# 2. Start MongoDB
mongod

# 3. Seed database
npm run seed

# 4. Start backend
npm run dev            # runs on :5000

# 5. Start frontend (new terminal)
cd client && npm start # runs on :3000
```

---

## 🔑 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | Search medicines (`?q=&category=&rx=`) |
| GET | `/api/medicines/:id` | Medicine detail + availability |
| GET | `/api/medicines/:id/alternatives` | Same-salt alternatives |
| GET | `/api/pharmacies` | All pharmacies (`?lat=&lng=&radius=`) |
| GET | `/api/stock/:pharmacyId` | Pharmacy stock levels |
| PUT | `/api/stock/:pharmacyId/:medicineId` | Update stock quantity |
| GET | `/api/emergency` | List emergency requests |
| POST | `/api/emergency` | Create emergency request |
| PATCH | `/api/emergency/:id/status` | Update request status |
| POST | `/api/prescriptions/upload` | Upload + OCR prescription |
| GET | `/api/prescriptions/:id` | Get OCR result |
| GET | `/api/health` | Server health check |

---

## 🛡️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, CSS Variables, Google Fonts |
| Backend | Node.js, Express 4, Socket.IO |
| Database | MongoDB with Mongoose ODM |
| OCR | Tesseract.js |
| File Upload | Multer |
| Real-time | Socket.IO (emergency alerts, stock sync) |
| Geospatial | MongoDB 2dsphere index |
| Auth | JWT + bcryptjs |
