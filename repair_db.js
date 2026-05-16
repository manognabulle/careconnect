const pool = require("./server/db");

async function repair() {
  try {
    console.log("Starting database repair...");

    // 1. Standardize specialty names and assign to NULLs
    const specialties = [
      'GENERAL PHYSICIAN', 'CARDIOLOGIST', 'DERMATOLOGIST', 'PEDIATRICIAN', 
      'ORTHOPEDIC', 'GYNECOLOGIST', 'NEUROLOGIST', 'ENT SPECIALIST', 
      'PSYCHIATRIST', 'PULMONOLOGIST'
    ];

    console.log("Standardizing specialties...");
    const docs = await pool.query("SELECT id FROM doctors WHERE specialty IS NULL OR specialty NOT IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", specialties);
    console.log(`Found ${docs.rows.length} doctors needing specialty update.`);

    for (let i = 0; i < docs.rows.length; i++) {
      const spec = specialties[i % specialties.length];
      await pool.query("UPDATE doctors SET specialty = $1 WHERE id = $2", [spec, docs.rows[i].id]);
    }
    
    // Also capitalize existing ones to match requirement
    await pool.query("UPDATE doctors SET specialty = UPPER(specialty)");

    // 2. Standardize doctor_schedule days to short names
    console.log("Standardizing schedule days...");
    const dayMap = {
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };

    for (const [full, short] of Object.entries(dayMap)) {
      // Delete the short one if it exists to avoid conflict before updating the full one
      await pool.query("DELETE FROM doctor_schedule WHERE day = $1 AND doctor_id IN (SELECT doctor_id FROM doctor_schedule WHERE day = $2)", [short, full]);
      await pool.query("UPDATE doctor_schedule SET day = $1 WHERE day = $2", [short, full]);
    }

    // 3. Fix potential schema mismatch in emergency_requests
    console.log("Fixing emergency_requests table...");
    await pool.query(`
      ALTER TABLE emergency_requests 
      ADD COLUMN IF NOT EXISTS medicine_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_name TEXT,
      ADD COLUMN IF NOT EXISTS accepted_by INTEGER REFERENCES pharmacies(id);
    `);
    
    // Sync medicine/patient columns
    await pool.query("UPDATE emergency_requests SET medicine_name = medicine WHERE medicine_name IS NULL");
    await pool.query("UPDATE emergency_requests SET patient_name = patient WHERE patient_name IS NULL");

    // 4. Fix reservations schema
    console.log("Fixing reservations table...");
    await pool.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes');
    `);

    console.log("Database repair complete.");
    process.exit(0);
  } catch (err) {
    console.error("Repair failed:", err);
    process.exit(1);
  }
}

repair();
