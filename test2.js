const pool = require("./server/db.js");
async function main() {
  const rs1 = await pool.query("SELECT * FROM stock");
  console.log("Stock:", rs1.rows);
  const rs2 = await pool.query("SELECT * FROM pharmacies");
  console.log("Pharmacies:", rs2.rows);
  process.exit(0);
}
main();
