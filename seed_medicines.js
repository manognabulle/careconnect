const pool = require("./server/db.js");

const MEDICINES = [
  { name: "Calpol 500mg", salt: "Paracetamol", category: "Analgesic", price: 22, description: "Fever and pain relief", req: false },
  { name: "Dolo 650", salt: "Paracetamol", category: "Analgesic", price: 30, description: "Relief from fever and pain", req: false },
  { name: "Mox 500", salt: "Amoxicillin", category: "Antibiotic", price: 72, description: "Bacterial infection treatment", req: true },
  { name: "Novamox 500", salt: "Amoxicillin", category: "Antibiotic", price: 90, description: "Treats bacterial infections", req: true },
  { name: "Azithral 500", salt: "Azithromycin", category: "Antibiotic", price: 120, description: "Broad-spectrum antibiotic", req: true },
  { name: "Zithromax 500", salt: "Azithromycin", category: "Antibiotic", price: 150, description: "Treats bacterial infections", req: true },
  { name: "Zady 500", salt: "Azithromycin", category: "Antibiotic", price: 115, description: "Treats respiratory infections", req: true },
  { name: "Glycomet 500", salt: "Metformin HCl", category: "Antidiabetic", price: 42, description: "Controls blood sugar levels", req: true },
  { name: "Jardiance 10mg", salt: "Empagliflozin", category: "Antidiabetic", price: 550, description: "Treats type 2 diabetes", req: true },
  { name: "Omez 20", salt: "Omeprazole", category: "Antacid", price: 48, description: "Reduces stomach acid", req: false },
  { name: "Pantocid 40", salt: "Pantoprazole", category: "Antacid", price: 65, description: "Treats acidity and heartburn", req: false },
  { name: "Lipitor 10mg", salt: "Atorvastatin", category: "Statin", price: 80, description: "Lowers bad cholesterol", req: true },
  { name: "Atorva 10", salt: "Atorvastatin", category: "Statin", price: 60, description: "Cholesterol management", req: true },
  { name: "Brufen 400", salt: "Ibuprofen", category: "NSAID", price: 25, description: "Reduces inflammation and pain", req: false },
  { name: "Voveran 50mg", salt: "Diclofenac", category: "NSAID", price: 45, description: "Relief from joint pain", req: true },
  { name: "Zyrtec 10mg", salt: "Cetirizine HCl", category: "Antihistamine", price: 32, description: "Relief from allergy symptoms", req: false },
  { name: "Allegra 120mg", salt: "Fexofenadine", category: "Antihistamine", price: 180, description: "Non-drowsy allergy relief", req: false },
  { name: "Pan 40", salt: "Pantoprazole", category: "Antacid", price: 58, description: "Proton pump inhibitor", req: false },
  { name: "Digene Gel", salt: "Magnesium Hydroxide", category: "Antacid", price: 120, description: "Instant acidity relief", req: false },
  { name: "Combiflam", salt: "Ibuprofen & Paracetamol", category: "Analgesic", price: 40, description: "Fever and body ache", req: false },
  { name: "Limcee 500mg", salt: "Vitamin C", category: "Supplement", price: 25, description: "Immunity booster", req: false },
  { name: "Shelcal 500", salt: "Calcium & Vit D3", category: "Supplement", price: 95, description: "Bone health supplement", req: false },
  { name: "Telma 40", salt: "Telmisartan", category: "Antihypertensive", price: 110, description: "Controls high blood pressure", req: true },
  { name: "Amlokind 5", salt: "Amlodipine", category: "Antihypertensive", price: 35, description: "Treats hypertension", req: true },
  { name: "Becosules Z", salt: "B-Complex + Zinc", category: "Supplement", price: 45, description: "Multivitamin for daily health", req: false },
  { name: "Avil 25", salt: "Pheniramine Maleate", category: "Antiallergic", price: 10, description: "Treats severe allergies", req: false },
  { name: "Taxim-O 200", salt: "Cefixime", category: "Antibiotic", price: 105, description: "Treats urinary tract infections", req: true },
  { name: "Augmentin 625 Duo", salt: "Amoxicillin & Clavulanate", category: "Antibiotic", price: 200, description: "Strong bacterial treatment", req: true },
  { name: "Montair LC", salt: "Montelukast & Levocetirizine", category: "Antiallergic", price: 185, description: "Relief from hay fever", req: true },
  { name: "Ascoril LS", salt: "Ambroxol & Levosalbutamol", category: "Cough Syrup", price: 115, description: "Relief from wet cough", req: false },
  { name: "Benadryl", salt: "Diphenhydramine", category: "Cough Syrup", price: 140, description: "Relief from dry cough", req: false },
  { name: "Deriphyllin", salt: "Theophylline & Etofylline", category: "Asthma", price: 15, description: "Helps in easy breathing", req: true },
  { name: "Wysolone 10mg", salt: "Prednisolone", category: "Steroid", price: 12, description: "Reduces severe inflammation", req: true },
  { name: "Eptoin 100", salt: "Phenytoin", category: "Antiepileptic", price: 45, description: "Prevents seizures", req: true },
  { name: "Levipil 500", salt: "Levetiracetam", category: "Antiepileptic", price: 130, description: "Controls epilepsy", req: true },
  { name: "Thyronorm 50", salt: "Thyroxine", category: "Hormone", price: 160, description: "Treats hypothyroidism", req: true },
  { name: "Liv 52", salt: "Herbal Extract", category: "Liver Care", price: 150, description: "Improves liver function", req: false },
  { name: "Cystone", salt: "Herbal Extract", category: "Kidney Care", price: 165, description: "Prevents kidney stones", req: false },
  { name: "Isabgol", salt: "Psyllium Husk", category: "Laxative", price: 220, description: "Relief from constipation", req: false },
  { name: "Cremaffin", salt: "Liquid Paraffin", category: "Laxative", price: 240, description: "Gentle stool softener", req: false },
  { name: "Metrogyl 400", salt: "Metronidazole", category: "Antiprotozoal", price: 22, description: "Treats stomach infections", req: true }
];

async function seed() {
  console.log("Cleaning existing data...");
  await pool.query("DELETE FROM stock");
  await pool.query("DELETE FROM medicines");
  
  console.log(`Seeding ${MEDICINES.length} medicines...`);
  for (const med of MEDICINES) {
    const res = await pool.query(
      "INSERT INTO medicines (name, salt, category, price, description, requires_prescription) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [med.name, med.salt, med.category, med.price, med.description, med.req]
    );
    const medId = res.rows[0].id;
    
    // Randomly assign stock to 6 pharmacies
    for (let pId = 1; pId <= 6; pId++) {
      if (Math.random() > 0.2) {
        await pool.query(
          "INSERT INTO stock (pharmacy_id, medicine_id, quantity) VALUES ($1, $2, $3)",
          [pId, medId, Math.floor(Math.random() * 80) + 20]
        );
      }
    }
  }
  console.log("✅ Seeded successfully with 40 medicines and descriptions.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
