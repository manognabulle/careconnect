const pool = require("./server/db.js");

const MISSING_MEDS = [
  { name: "Novamox 500", salt: "Amoxicillin", category: "Antibiotic", manufacturer: "Cipla", price: 85, usage: "Bacterial infections", req: true },
  { name: "Novamox 250", salt: "Amoxicillin", category: "Antibiotic", manufacturer: "Cipla", price: 45, usage: "Bacterial infections", req: true },
  { name: "Paracetamol", salt: "Paracetamol", category: "Analgesic", manufacturer: "Generic", price: 10, usage: "Fever and pain", req: false },
  { name: "Amoxicillin", salt: "Amoxicillin", category: "Antibiotic", manufacturer: "Generic", price: 60, usage: "Bacterial infections", req: true },
  { name: "Dolo", salt: "Paracetamol", category: "Analgesic", manufacturer: "Micro Labs", price: 25, usage: "Fever relief", req: false },
];

async function fix() {
  try {
    for (const med of MISSING_MEDS) {
      console.log(`Adding missing medicine: ${med.name}`);
      await pool.query(
        "INSERT INTO medicines (name, salt, category, price, description, requires_prescription, manufacturer) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING",
        [med.name, med.salt, med.category, med.price, med.usage, med.req, med.manufacturer]
      );
    }
    console.log("✅ Missing medicines added!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
