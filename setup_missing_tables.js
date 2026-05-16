const pool = require("./server/db.js");

async function setup() {
  try {
    console.log("Setting up missing tables...");

    // 0. Pharmacies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        area TEXT,
        address TEXT,
        phone TEXT,
        hours TEXT,
        rating DECIMAL(2,1) DEFAULT 4.0,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        is_emergency BOOLEAN DEFAULT FALSE
      );
    `);

    // 0.5 Medicines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        salt TEXT,
        category TEXT,
        price INTEGER NOT NULL,
        description TEXT,
        requires_prescription BOOLEAN DEFAULT FALSE,
        manufacturer TEXT,
        image_url TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user','doctor','pharmacy')),
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        doctor_id INTEGER REFERENCES doctors(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1. Doctors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        experience INTEGER DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 4.5,
        fee INTEGER DEFAULT 500,
        email TEXT UNIQUE,
        phone TEXT,
        bio TEXT,
        image_url TEXT
      );
    `);

    // 2. Appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_name TEXT NOT NULL,
        patient_email TEXT NOT NULL,
        doctor_id INTEGER REFERENCES doctors(id),
        date DATE NOT NULL,
        time TEXT NOT NULL,
        reason TEXT,
        type TEXT DEFAULT 'offline',
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Doctor Schedule table
    await pool.query(`DROP TABLE IF EXISTS doctor_schedule;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctor_schedule (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        day TEXT NOT NULL,
        slots TEXT[] DEFAULT '{}',
        blocked_slots TEXT[] DEFAULT '{}',
        UNIQUE(doctor_id, day)
      );
    `);

    // 4. Pharmacy Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        user_name TEXT NOT NULL,
        user_email TEXT,
        items JSONB NOT NULL,
        total_amount INTEGER NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'received',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        medicine_id INTEGER REFERENCES medicines(id),
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        quantity INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        reserved_until TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Prescriptions table (Digital)
    const prescCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'prescriptions' AND column_name = 'filename'
    `);
    if (prescCheck.rows.length > 0) {
      console.log("Renaming OCR prescriptions table to prescription_uploads...");
      await pool.query("ALTER TABLE prescriptions RENAME TO prescription_uploads;");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        appointment_id INTEGER REFERENCES appointments(id),
        patient_name TEXT NOT NULL,
        patient_email TEXT NOT NULL,
        medicines JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS reserved_until
      TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes');
    `);

    console.log("Tables created successfully.");

    // Seed some doctors if empty
    const docCheck = await pool.query("SELECT COUNT(*) FROM doctors");
    if (parseInt(docCheck.rows[0].count) === 0) {
      console.log("Seeding doctors...");
      const doctors = [
        ["Dr. Sarah Johnson", "General Physician", 12, 4.8, 500, "sarah@careconnect.com"],
        ["Dr. Anil Kumar", "Cardiologist", 20, 4.9, 1200, "anil@careconnect.com"],
        ["Dr. Emily Chen", "Dermatologist", 8, 4.7, 800, "emily@careconnect.com"],
        ["Dr. Rajesh Gupta", "Pediatrician", 15, 4.6, 600, "rajesh@careconnect.com"],
        ["Dr. Monica Roy", "Gynecologist", 10, 4.8, 900, "monica@careconnect.com"]
      ];

      for (const doc of doctors) {
        const res = await pool.query(
          "INSERT INTO doctors (name, specialty, experience, rating, fee, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          doc
        );
        const docId = res.rows[0].id;

        // Seed schedule for each doctor
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const slots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"];
        for (const day of days) {
          await pool.query(
            "INSERT INTO doctor_schedule (doctor_id, day, slots) VALUES ($1, $2, $3)",
            [docId, day, slots]
          );
        }
      }
      console.log("Doctors and schedules seeded.");
    }

    // Seed pharmacies if empty
    const pharmCheck = await pool.query("SELECT COUNT(*) FROM pharmacies");
    if (parseInt(pharmCheck.rows[0].count) === 0) {
      console.log("Seeding pharmacies...");
      await pool.query(`
        INSERT INTO pharmacies (name, area, address, phone, hours, rating, lat, lng, is_emergency) VALUES
        ('MedPlus Pharmacy', 'Koramangala', '123 Koramangala, Bengaluru', '+91 80 4567 8901', '8 AM - 10 PM', 4.5, 12.9352, 77.6245, TRUE),
        ('Apollo Pharmacy', 'Indiranagar', '456 Indiranagar, Bengaluru', '+91 80 2234 5678', '24 Hours', 4.8, 12.9784, 77.6408, TRUE),
        ('Netmeds Store', 'HSR Layout', '789 HSR Layout, Bengaluru', '+91 80 4456 7890', '9 AM - 11 PM', 4.3, 12.9116, 77.6474, FALSE)
      `);
      console.log("Pharmacies seeded.");
    }

    // Seed medicines if empty
    const medCheck = await pool.query("SELECT COUNT(*) FROM medicines");
    if (parseInt(medCheck.rows[0].count) === 0) {
      console.log("Seeding medicines...");
      await pool.query(`
        INSERT INTO medicines (name, salt, category, price, description, requires_prescription) VALUES
        ('Calpol 500mg', 'Paracetamol', 'Analgesic', 22, 'Fever and pain relief', FALSE),
        ('Dolo 650', 'Paracetamol', 'Analgesic', 30, 'Relief from fever and pain', FALSE),
        ('Mox 500', 'Amoxicillin', 'Antibiotic', 72, 'Bacterial infection treatment', TRUE),
        ('Omez 20', 'Omeprazole', 'Antacid', 48, 'Reduces stomach acid', FALSE),
        ('Lipitor 10mg', 'Atorvastatin', 'Statin', 80, 'Lowers bad cholesterol', TRUE)
      `);
      console.log("Medicines seeded.");
    }

    // Seed stock if empty
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock (
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        medicine_id INTEGER REFERENCES medicines(id),
        quantity INTEGER DEFAULT 0,
        PRIMARY KEY (pharmacy_id, medicine_id)
      );
    `);
    const stockCheck = await pool.query("SELECT COUNT(*) FROM stock");
    if (parseInt(stockCheck.rows[0].count) === 0) {
      console.log("Seeding stock...");
      const pharms = await pool.query("SELECT id FROM pharmacies");
      const meds = await pool.query("SELECT id FROM medicines");
      for (const p of pharms.rows) {
        for (const m of meds.rows) {
          await pool.query(
            "INSERT INTO stock (pharmacy_id, medicine_id, quantity) VALUES ($1, $2, $3)",
            [p.id, m.id, Math.floor(Math.random() * 100) + 20]
          );
        }
      }
      console.log("Stock seeded.");
    }

    // Emergency Requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_requests (
        id SERIAL PRIMARY KEY,
        medicine TEXT NOT NULL,
        patient TEXT NOT NULL,
        user_email TEXT,
        priority TEXT DEFAULT 'high',
        status TEXT DEFAULT 'pending',
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    process.exit(0);
  } catch (err) {
    console.error("Error setting up tables:", err);
    process.exit(1);
  }
}

setup();
