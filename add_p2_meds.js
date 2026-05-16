const pool = require("./server/db.js");

const MISSING_MEDS = [
  { name: "Brufen 400", salt: "Ibuprofen", category: "NSAID", manufacturer: "Abbott", price: 25, usage: "Pain and inflammation", req: false },
  { name: "Pan 40", salt: "Pantoprazole", category: "Antacid", manufacturer: "Alkem", price: 75, usage: "Acidity and heartburn", req: false },
  { name: "Mox 500", salt: "Amoxicillin", category: "Antibiotic", manufacturer: "Sun Pharma", price: 65, usage: "Bacterial infections", req: true },
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
    console.log("✅ Latest missing medicines added!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
