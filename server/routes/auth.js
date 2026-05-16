const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password, role, pharmacyId, doctorId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role are required" });
  }
  if (!["user", "doctor", "pharmacy"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, pharmacy_id, doctor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, pharmacy_id, doctor_id`,
      [name, email, password_hash, role, pharmacyId || null, doctorId || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacy_id,
        doctorId: user.doctor_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    // Support login by email OR pharmacy name
    let user;
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    
    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // If no user found by email, check if 'email' is actually a pharmacy name
      const pharmResult = await pool.query("SELECT id FROM pharmacies WHERE LOWER(name) = LOWER($1)", [email]);
      if (pharmResult.rows.length > 0) {
        const pharmId = pharmResult.rows[0].id;
        const userResult = await pool.query("SELECT * FROM users WHERE pharmacy_id = $1", [pharmId]);
        if (userResult.rows.length > 0) {
          user = userResult.rows[0];
        }
      } else {
        // Check if 'email' is a doctor's name
        const docResult = await pool.query("SELECT id FROM doctors WHERE LOWER(name) = LOWER($1) OR LOWER(REPLACE(name, 'Dr. ', '')) = LOWER($1)", [email]);
        if (docResult.rows.length > 0) {
          const docId = docResult.rows[0].id;
          const userResult = await pool.query("SELECT * FROM users WHERE doctor_id = $1", [docId]);
          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
          }
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: "No account found with this email or name." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacy_id,
        doctorId: user.doctor_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacy_id,
        doctorId: user.doctor_id,
      },
    });
  } catch (err) {
    console.error("[LOGIN ERROR]:", err);
    res.status(500).json({ error: "Server authentication error: " + err.message });
  }
});

module.exports = router;
