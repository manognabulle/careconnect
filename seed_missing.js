const pool = require("./server/db.js");

const MEDICINES = [
  { name: "Calpol 500mg", salt: "Paracetamol", category: "Analgesic", price: 22, manufacturer: "GSK", req: false },
  { name: "Mox 500", salt: "Amoxicillin", category: "Antibiotic", price: 72, manufacturer: "Ranbaxy", req: true },
  { name: "Novamox 500", salt: "Amoxicillin", category: "Antibiotic", price: 90, manufacturer: "Cipla", req: true },
  { name: "Glycomet 500", salt: "Metformin HCl", category: "Antidiabetic", price: 42, manufacturer: "USV", req: true },
  { name: "Azithromycin 500mg", salt: "Azithromycin", category: "Antibiotic", price: 120, manufacturer: "Pfizer", req: true },
  { name: "Zithromax 500", salt: "Azithromycin", category: "Antibiotic", price: 135, manufacturer: "Pfizer", req: true },
  { name: "Omeprazole 20mg", salt: "Omeprazole", category: "Antacid", price: 55, manufacturer: "AstraZeneca", req: false },
  { name: "Omez 20", salt: "Omeprazole", category: "Antacid", price: 48, manufacturer: "Dr. Reddy's", req: false },
  { name: "Atorvastatin 10mg", salt: "Atorvastatin", category: "Statin", price: 65, manufacturer: "Pfizer", req: true },
  { name: "Lipitor 10mg", salt: "Atorvastatin", category: "Statin", price: 80, manufacturer: "Pfizer", req: true },
  { name: "Brufen 400", salt: "Ibuprofen", category: "NSAID", price: 25, manufacturer: "Abbott", req: false },
  { name: "Cetirizine 10mg", salt: "Cetirizine HCl", category: "Antihistamine", price: 15, manufacturer: "Sun Pharma", req: false },
  { name: "Zyrtec 10mg", salt: "Cetirizine HCl", category: "Antihistamine", price: 32, manufacturer: "J&J", req: false },
  { name: "Pantoprazole 40mg", salt: "Pantoprazole", category: "PPI", price: 72, manufacturer: "Wyeth", req: true },
  { name: "Pan 40", salt: "Pantoprazole", category: "PPI", price: 58, manufacturer: "Alkem", req: false },
];

async function seed() {
  for (const med of MEDICINES) {
    const res = await pool.query(
      "INSERT INTO medicines (name, salt, category, price, manufacturer, requires_prescription) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [med.name, med.salt, med.category, med.price, med.manufacturer, med.req]
    );
    const medId = res.rows[0].id;
    // Insert some stock in pharmacies 1 to 6
    for (let pId = 1; pId <= 6; pId++) {
      if (Math.random() > 0.3) {
        await pool.query(
          "INSERT INTO stock (pharmacy_id, medicine_id, quantity) VALUES ($1, $2, $3)",
          [pId, medId, Math.floor(Math.random() * 50) + 1]
        );
      }
    }
  }
  console.log("Seeded successfully");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
