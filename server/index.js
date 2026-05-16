require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const http = require("http");
const { Server } = require("socket.io");
const { body, validationResult } = require("express-validator");
const { sendEmail } = require("./utils/emailService");
const { requireAuth, requireRole } = require("./middleware/auth");

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
].filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
  },
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ocr", require("./routes/prescriptions")); // Renamed from prescriptions to ocr to avoid conflict

io.on("connection", (socket) => {
  socket.on("disconnect", () => { });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/doctors", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM doctors ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/doctors/:id", async (req, res) => {
  const { specialty, fee, phone, bio, hospital, consultation_mode } = req.body;
  try {
    const result = await pool.query(
      "UPDATE doctors SET specialty = $1, fee = $2, phone = $3, bio = $4, hospital = $5, consultation_mode = $6 WHERE id = $7 RETURNING *",
      [specialty, fee, phone, bio, hospital, consultation_mode, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/doctor-schedule/:doctor_id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM doctor_schedule WHERE doctor_id = $1", [
      req.params.doctor_id,
    ]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/doctor-schedule/:doctor_id", requireAuth, async (req, res) => {
  const { day, slots, blocked_slots } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO doctor_schedule (doctor_id, day, slots, blocked_slots) VALUES ($1, $2, $3, $4) ON CONFLICT (doctor_id, day) DO UPDATE SET slots = $3, blocked_slots = $4 RETURNING *",
      [req.params.doctor_id, day, slots, blocked_slots]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    if (doctor_id && date) {
      const result = await pool.query(
        "SELECT time FROM appointments WHERE doctor_id=$1 AND date=$2 AND status != 'cancelled'",
        [doctor_id, date]
      );
      return res.json(result.rows);
    }
    const result = await pool.query(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty
      FROM appointments a JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.date DESC, a.time DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/appointments",
  requireAuth,
  body("patient_name").trim().notEmpty().withMessage("patient_name required"),
  body("patient_email").isEmail().withMessage("valid email required"),
  body("doctor_id").isInt({ min: 1 }),
  body("date").isDate().withMessage("valid date required"),
  body("time").notEmpty(),
  body("type").isIn(["online", "offline"]),
  validate,
  async (req, res) => {
    const { patient_name, patient_email, doctor_id, date, time, reason, type, payment_status } = req.body;
    try {
      const check = await pool.query(
        "SELECT id FROM appointments WHERE doctor_id = $1 AND date = $2 AND time = $3 AND status != 'cancelled'",
        [doctor_id, date, time]
      );
      if (check.rows.length > 0) {
        return res.status(400).json({ error: "This slot is already booked." });
      }

      const result = await pool.query(
        "INSERT INTO appointments (patient_name, patient_email, doctor_id, date, time, reason, type, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [patient_name, patient_email, doctor_id, date, time, reason, type, payment_status || (type === 'online' ? 'pending' : 'paid')]
      );

      io.emit("appointment:new", result.rows[0]);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.put("/api/appointments/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );

    const appt = result.rows[0];

    if (status === "confirmed") {
      const meetLink = `https://meet.jit.si/CareConnect-${appt.id}`;
      const isOnline = appt.type === "online";
      const subject = isOnline ? "Online Consultation Confirmed" : "Appointment Confirmed";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0d9488; padding: 20px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Appointment Confirmed</h1>
          </div>
          <div style="padding: 30px;">
            <p>Hi <strong>${appt.patient_name}</strong>,</p>
            <p>Your appointment has been confirmed for <strong>${new Date(appt.date).toLocaleDateString()}</strong> at <strong>${appt.time}</strong>.</p>
            ${isOnline
          ? `
              <div style="margin-top: 24px; padding: 20px; background: #f0fdfa; border-radius: 8px; text-align: center;">
                <p style="margin-bottom: 16px; font-weight: 600;">This is an Online Consultation</p>
                <a href="${meetLink}" style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Video Call</a>
                <p style="font-size: 12px; color: #666; margin-top: 16px;">Or copy this link: ${meetLink}</p>
              </div>
            `
          : `<p>Mode: <strong>In-Person (Offline)</strong></p>`
        }
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              Regards,<br>CareConnect Team
            </div>
          </div>
        </div>
      `;

      try {
        await sendEmail(appt.patient_email, subject, htmlContent);
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
      }
    }

    io.emit("appointment:update", appt);
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/appointments/:id/pay", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE appointments SET payment_status = 'paid' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Appointment not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/prescriptions", requireAuth, async (req, res) => {
  const { doctor_id, appointment_id, patient_name, patient_email, medicines } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO prescriptions (doctor_id, appointment_id, patient_name, patient_email, medicines) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [doctor_id, appointment_id, patient_name, patient_email, JSON.stringify(medicines)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/prescriptions", requireAuth, async (req, res) => {
  try {
    const { appointment_id } = req.query;
    let result;
    if (appointment_id) {
      result = await pool.query("SELECT * FROM prescriptions WHERE appointment_id = $1", [
        appointment_id,
      ]);
    } else {
      result = await pool.query("SELECT * FROM prescriptions ORDER BY created_at DESC");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    let query = "SELECT * FROM orders ORDER BY created_at DESC";
    let params = [];

    // If user is a pharmacy, enforce isolation
    if (req.user.role === "pharmacy") {
      query = "SELECT * FROM orders WHERE pharmacy_id = $1 ORDER BY created_at DESC";
      params = [req.user.pharmacyId];
    } else {
      const { pharmacy_id } = req.query;
      if (pharmacy_id) {
        query = "SELECT * FROM orders WHERE pharmacy_id = $1 ORDER BY created_at DESC";
        params = [pharmacy_id];
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/orders",
  requireAuth,
  body("pharmacy_id").isInt({ min: 1 }),
  body("user_name").trim().notEmpty(),
  body("items").isArray({ min: 1 }),
  body("total_amount").isInt({ min: 1 }),
  validate,
  async (req, res) => {
    const { pharmacy_id, user_name, user_email, items, total_amount, payment_status, order_status } =
      req.body;
    try {
      const normalizedItems = Array.isArray(items) ? items : [];
      const result = await pool.query(
        "INSERT INTO orders (pharmacy_id, user_name, user_email, items, total_amount, payment_status, order_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          pharmacy_id,
          user_name,
          user_email,
          JSON.stringify(normalizedItems),
          total_amount,
          payment_status || "pending",
          order_status || "received",
        ]
      );

      io.emit("order:new", result.rows[0]);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.put("/api/orders/:id", requireAuth, async (req, res) => {
  const { order_status, payment_status } = req.body;
  let query = "UPDATE orders SET ";
  const params = [];
  let index = 1;

  if (order_status) {
    query += `order_status = $${index}, `;
    params.push(order_status);
    index++;
  }
  if (payment_status) {
    query += `payment_status = $${index}, `;
    params.push(payment_status);
    index++;
  }

  query = query.slice(0, -2) + ` WHERE id = $${index} RETURNING *`;
  params.push(req.params.id);

  try {
    const result = await pool.query(query, params);
    io.emit("order:update", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM medicines");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const strict = req.query.strict === "true";
    const terms = q
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (terms.length === 0) {
      return res.json([]);
    }

    let result;
    if (strict) {
      const likeTerms = terms.map((t) => `${t}%`);
      result = await pool.query(
        `
        SELECT * FROM medicines
        WHERE LOWER(name) LIKE ANY($1)
        `,
        [likeTerms]
      );
    } else {
      const likeTerms = terms.map((t) => `%${t}%`);
      result = await pool.query(
        `
        SELECT * FROM medicines
        WHERE LOWER(name) LIKE ANY($1)
           OR LOWER(salt) LIKE ANY($1)
           OR LOWER(category) LIKE ANY($1)
        `,
        [likeTerms]
      );
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pharmacies", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pharmacies");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stock", async (req, res) => {
  try {
    const { pharmacy_id } = req.query;
    let query = "SELECT * FROM stock";
    let params = [];
    if (pharmacy_id) {
      query = "SELECT * FROM stock WHERE pharmacy_id = $1";
      params = [pharmacy_id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/stock", requireAuth, async (req, res) => {
  const { pharmacy_id, medicine_id, quantity } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO stock (pharmacy_id, medicine_id, quantity) VALUES ($2, $3, $1) ON CONFLICT (pharmacy_id, medicine_id) DO UPDATE SET quantity = $1 RETURNING *",
      [quantity, pharmacy_id, medicine_id]
    );

    io.emit("stock:update", { pharmacy_id, medicine_id, quantity });
    res.json(result.rows[0] || { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/availability/:id", async (req, res) => {
  const medicineId = req.params.id;
  const result = await pool.query(
    `SELECT
        s.pharmacy_id,
        p.name as pharmacy,
        p.lat,
        p.lng,
        s.quantity
     FROM stock s
     JOIN pharmacies p ON s.pharmacy_id = p.id
     WHERE s.medicine_id = $1`,
    [medicineId]
  );
  res.json(result.rows);
});

app.post(
  "/api/reserve",
  requireAuth,
  body("medicine_id").isInt({ min: 1 }),
  body("pharmacy_id").isInt({ min: 1 }),
  body("quantity").isInt({ min: 1 }),
  validate,
  async (req, res) => {
    try {
      const { medicine_id, pharmacy_id, quantity } = req.body;
      const stockCheck = await pool.query(
        "SELECT quantity FROM stock WHERE medicine_id=$1 AND pharmacy_id=$2",
        [medicine_id, pharmacy_id]
      );

      if (stockCheck.rows.length === 0) {
        return res.status(404).json({ error: "Stock not found" });
      }

      const available = stockCheck.rows[0].quantity;
      if (available < quantity) {
        return res.status(400).json({ error: "Not enough stock" });
      }

      const reservation = await pool.query(
        `INSERT INTO reservations (medicine_id, pharmacy_id, quantity, reserved_until)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes') RETURNING *`,
        [medicine_id, pharmacy_id, quantity]
      );

      await pool.query(
        `UPDATE stock
         SET quantity = quantity - $1
         WHERE medicine_id=$2 AND pharmacy_id=$3`,
        [quantity, medicine_id, pharmacy_id]
      );

      io.emit("stock:update", {
        pharmacy_id,
        medicine_id,
        quantity: available - quantity,
      });

      res.json({
        message: "Reservation successful",
        reservation: reservation.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.get("/api/reservations", requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT r.*, m.name as medicine_name, p.name as pharmacy_name
      FROM reservations r
      JOIN medicines m ON r.medicine_id = m.id
      JOIN pharmacies p ON r.pharmacy_id = p.id
    `;
    let params = [];

    if (req.user.role === "pharmacy") {
      query += " WHERE r.pharmacy_id = $1";
      params = [req.user.pharmacyId];
    } else {
      const { pharmacy_id } = req.query;
      if (pharmacy_id) {
        query += " WHERE r.pharmacy_id = $1";
        params = [pharmacy_id];
      }
    }

    query += " ORDER BY r.created_at DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/reservations/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/emergency",
  requireAuth,
  body("medicine").trim().notEmpty(),
  body("patient").trim().notEmpty(),
  body("priority").isIn(["critical", "high", "medium"]),
  validate,
  async (req, res) => {
    const { medicine, patient, priority } = req.body;

    try {
      const result = await pool.query(
        `
  INSERT INTO emergency_requests
  (
    medicine,
    patient,
    medicine_name,
    patient_name,
    priority,
    status,
    user_email
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *
  `,
        [
          medicine,
          patient,
          medicine,
          patient,
          priority,
          "pending",
          req.user.email
        ]
      );
      const requestData = result.rows[0];

      req.io.emit("new-emergency-request", requestData);
      res.json({
        message: "Emergency request sent to nearby pharmacies",
        request: requestData,
      });
    } catch (err) {
      console.error("[EMERGENCY POST ERROR]:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.get("/api/emergency", requireAuth, async (req, res) => {
  try {
    let query = "SELECT * FROM emergency_requests";
    let params = [];

    if (req.user.role === "pharmacy") {
      query = "SELECT * FROM emergency_requests WHERE status = 'pending' OR pharmacy_id = $1 OR accepted_by = $1";
      params = [req.user.pharmacyId];
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/emergency/:id/accept", requireAuth, async (req, res) => {
  const pharmacyId = req.user.pharmacyId || req.user.pharmacy_id;
  if (!pharmacyId) return res.status(403).json({ error: "Only pharmacies can accept emergencies" });

  try {
    const pharmRes = await pool.query("SELECT name FROM pharmacies WHERE id = $1", [pharmacyId]);
    const pharmacyName = pharmRes.rows[0]?.name || "Local Pharmacy";

    const result = await pool.query(
      `UPDATE emergency_requests
       SET status = 'accepted', pharmacy_id = $1, accepted_by = $1
       WHERE id = $2
       RETURNING *`,
      [pharmacyId, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Emergency request not found" });
    const updated = result.rows[0];

    // Send email to user
    if (updated.user_email) {
      const emailService = require("./utils/emailService");
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0d9488; margin-top: 0;">Emergency Request Accepted</h2>
          <p>Your emergency request for <strong>${updated.medicine_name || updated.medicine}</strong> has been accepted by <strong>${pharmacyName}</strong>.</p>
          <div style="margin: 24px 0; padding: 20px; background: #f0fdfa; border-radius: 8px; border-left: 4px solid #0d9488;">
            <p style="margin: 0; font-weight: 600; color: #0d9488;">Dispatch Message:</p>
            <p style="margin: 8px 0 0 0;">Your emergency request for ${updated.medicine_name || updated.medicine} has been accepted by ${pharmacyName}. We are dispatching it immediately.</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">The pharmacy is currently dispatching your medicine. Please stay alert for further updates.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">CareConnect Emergency System</p>
        </div>
      `;
      await emailService.sendEmail(updated.user_email, `Emergency Request Accepted: ${updated.medicine_name || updated.medicine}`, html);
    }

    req.io.emit("emergency:update", { id: req.params.id, status: 'accepted', pharmacy_id: pharmacyId, accepted_by: pharmacyId });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/emergency/:id", requireAuth, async (req, res) => {
  const { status, pharmacy_id } = req.body;

  try {
    let result;
    if (pharmacy_id) {
      result = await pool.query(
        `UPDATE emergency_requests
         SET status = $1, pharmacy_id = $2, accepted_by = $2
         WHERE id = $3
         RETURNING *`,
        [status, pharmacy_id, req.params.id]
      );
    } else {
      result = await pool.query(
        `UPDATE emergency_requests
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, req.params.id]
      );
    }

    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const statusUpdate = result.rows[0];
    io.emit("emergency:update", { id: req.params.id, status: statusUpdate.status, pharmacy_id: statusUpdate.pharmacy_id });
    res.json(statusUpdate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

console.log("Email system switched to Brevo (Sendinblue) API");

app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, htmlContent } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ success: false, error: "Missing recipient (to) or subject" });
  }

  const content =
    htmlContent ||
    (text ? `<p>${text.replace(/\n/g, "<br>")}</p>` : "<p>Default message from CareConnect.</p>");

  try {
    const result = await sendEmail(to, subject, content);
    if (result.success) {
      res.json({ success: true, message: "REAL Email sent via Brevo API", data: result.data });
    } else {
      res.status(500).json({ success: false, error: "Brevo API call failed", details: result.error });
    }
  } catch (err) {
    console.error("[ROUTE ERROR]:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/api/test-email", async (req, res) => {
  const testEmail = req.query.email || "manognabulle22@gmail.com";
  const subject = "Brevo API System Test";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #0d9488;">CareConnect System Test</h2>
      <p>This is a test email to verify that the <strong>Brevo (Sendinblue) API</strong> integration is working correctly.</p>
      <p>If you received this, the backend is successfully connected to Brevo.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">Sent from CareConnect Backend</p>
    </div>
  `;

  try {
    const result = await sendEmail(testEmail, subject, htmlContent);
    if (result.success) {
      res.send("<h1>Email sent successfully!</h1><p>Check your inbox (or spam) for the test message.</p>");
    } else {
      res.status(500).send(`<h1>Email failed</h1><pre>${JSON.stringify(result.error, null, 2)}</pre>`);
    }
  } catch (err) {
    res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
  }
});

const expireReservations = require("./utils/reservationExpiry");
const port = parseInt(process.env.PORT || "5000", 10);

async function startServer() {
  try {
    if (process.env.PG_PASSWORD === "<your_postgres_password>") {
      throw new Error("Set PG_PASSWORD in .env to your real PostgreSQL password.");
    }

    await pool.query("SELECT 1");
    server.listen(port, () => console.log(`CareConnect backend service active on port ${port}`));

    setInterval(() => {
      expireReservations().catch((err) => {
        console.error("Reservation expiry task failed:", err.message);
      });
    }, 60 * 1000);

    await expireReservations();
  } catch (err) {
    console.error("Database startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
