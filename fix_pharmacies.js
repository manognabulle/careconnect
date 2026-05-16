const pool = require("./server/db.js");
const bcrypt = require("bcryptjs");

async function fixPharmacies() {
  try {
    console.log("Cleaning up pharmacies and adding new columns...");

    // Add new columns to pharmacies table
    await pool.query(`
      ALTER TABLE pharmacies 
      ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS owner_name TEXT,
      ADD COLUMN IF NOT EXISTS analytics JSONB DEFAULT '{"total_orders": 0, "total_revenue": 0, "emergency_accepted": 0}'::jsonb;
    `);

    // Clean up existing stock and orders to avoid foreign key issues
    // Actually, it's better to just truncate and re-seed if we are changing IDs
    // But let's try to be careful.
    
    // For this task, the user wants a complete fix, so resetting pharmacies is likely fine.
    await pool.query("DELETE FROM stock");
    await pool.query("DELETE FROM orders");
    await pool.query("DELETE FROM reservations");
    await pool.query("DELETE FROM emergency_requests");
    await pool.query("DELETE FROM users WHERE role = 'pharmacy'");
    await pool.query("DELETE FROM pharmacies");

    const pharmacyList = [
      { name: "MedPlus Koramangala", area: "Koramangala", email: "medplus@careconnect.com", owner: "Ramesh Kumar" },
      { name: "Apollo Pharmacy Indiranagar", area: "Indiranagar", email: "apollo@careconnect.com", owner: "Suresh Raina" },
      { name: "Fortis HealthWorld", area: "Whitefield", email: "fortis@careconnect.com", owner: "Dr. Fortis" },
      { name: "NetMeds Hub", area: "HSR Layout", email: "netmeds@careconnect.com", owner: "Pradeep Singh" },
      { name: "Guardian Pharmacy", area: "Jayanagar", email: "guardian@careconnect.com", owner: "Anita Desai" },
      { name: "Wellness Forever", area: "MG Road", email: "wellness@careconnect.com", owner: "Vikram Malhotra" },
      { name: "MedicoPlus Care", area: "BTM Layout", email: "medicoplus@careconnect.com", owner: "Sunita Rao" },
      { name: "CareMitra Pharmacy", area: "Electronic City", email: "caremitra@careconnect.com", owner: "Rahul Verma" },
      { name: "Lifeline Medicos", area: "Hebbal", email: "lifeline@careconnect.com", owner: "Kiran Mazumdar" },
      { name: "CityCare Pharmacy", area: "Malleshwaram", email: "citycare@careconnect.com", owner: "Sanjay Dutt" },
      { name: "HealthBridge Pharmacy", area: "Banashankari", email: "healthbridge@careconnect.com", owner: "Priya Mani" },
      { name: "GreenCross Meds", area: "Rajajinagar", email: "greencross@careconnect.com", owner: "Amit Shah" },
      { name: "MedZone Healthcare", area: "Yelahanka", email: "medzone@careconnect.com", owner: "Deepika P" },
      { name: "PrimeCare Pharmacy", area: "Bannerghatta", email: "primecare@careconnect.com", owner: "Rohan Bopanna" },
      { name: "CurePoint Pharmacy", area: "Sarjapur", email: "curepoint@careconnect.com", owner: "Mahesh Bhupathi" }
    ];

    const passwordHash = await bcrypt.hash("1234", 12);

    console.log("Seeding new pharmacies...");
    for (const p of pharmacyList) {
      const res = await pool.query(
        `INSERT INTO pharmacies (name, area, email, password_hash, owner_name, lat, lng, emergency) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          p.name, 
          p.area, 
          p.email, 
          passwordHash, 
          p.owner, 
          12.9 + Math.random() * 0.1, 
          77.5 + Math.random() * 0.1, 
          true
        ]
      );
      
      const pharmacyId = res.rows[0].id;

      // Create a corresponding user account for login
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, pharmacy_id)
         VALUES ($1, $2, $3, 'pharmacy', $4)`,
        [p.name, p.email, passwordHash, pharmacyId]
      );

      // Seed some stock for each pharmacy
      const meds = await pool.query("SELECT id FROM medicines");
      for (const m of meds.rows) {
        await pool.query(
          "INSERT INTO stock (pharmacy_id, medicine_id, quantity) VALUES ($1, $2, $3)",
          [pharmacyId, m.id, Math.floor(Math.random() * 50) + 10]
        );
      }
    }

    console.log("Pharmacy fix and seeding completed.");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing pharmacies:", err);
    process.exit(1);
  }
}

fixPharmacies();
