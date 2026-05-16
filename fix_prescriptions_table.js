const pool = require("./server/db.js");

async function fixTables() {
  try {
    console.log("Fixing prescriptions table...");
    
    // Rename old table if it has the wrong columns
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'prescriptions' AND column_name = 'filename';
    `);

    if (res.rows.length > 0) {
      console.log("Renaming old prescriptions table to prescription_uploads...");
      await pool.query("ALTER TABLE prescriptions RENAME TO prescription_uploads;");
    }

    console.log("Creating/Fixing prescriptions table for digital prescriptions...");
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

    console.log("Database tables fixed.");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing tables:", err);
    process.exit(1);
  }
}

fixTables();
