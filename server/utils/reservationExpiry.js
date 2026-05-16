const pool = require("../db");

async function expireReservations() {
  let expired;

  try {
    expired = await pool.query(
      `SELECT id, medicine_id, pharmacy_id, quantity FROM reservations
       WHERE status = 'pending' AND reserved_until < NOW()`
    );
  } catch (err) {
    if (err.code === "42703") {
      console.error("Reservation expiry skipped: run setup_missing_tables.js to add reserved_until.");
      return;
    }
    console.error("Reservation expiry skipped:", err.message);
    return;
  }

  for (const r of expired.rows) {
    try {
      await pool.query("BEGIN");
      await pool.query(
        "UPDATE stock SET quantity = quantity + $1 WHERE medicine_id=$2 AND pharmacy_id=$3",
        [r.quantity, r.medicine_id, r.pharmacy_id]
      );
      await pool.query("UPDATE reservations SET status='expired' WHERE id=$1", [r.id]);
      await pool.query("COMMIT");
    } catch (e) {
      try {
        await pool.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Expiry rollback failed for reservation", r.id, rollbackErr.message);
      }
      console.error("Expiry rollback for reservation", r.id, e.message);
    }
  }
}

module.exports = expireReservations;
