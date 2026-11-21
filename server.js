
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = path.join(__dirname, "public");
const ADMIN_DIR = path.join(__dirname, "admin");


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: "haven.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.status(401).json({
    message: "Please log in as an administrator."
  });
}

function safeEqual(a, b) {
  const first = Buffer.from(String(a || ""));
  const second = Buffer.from(String(b || ""));

  return first.length === second.length &&
    crypto.timingSafeEqual(first, second);
}

function validDateRange(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  return /^\d{4}-\d{2}-\d{2}$/.test(checkIn || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOut || "") &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start;
}

function nightsBetween(checkIn, checkOut) {
  return Math.round(
    (new Date(`${checkOut}T00:00:00`) -
    new Date(`${checkIn}T00:00:00`)) / 86400000
  );
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// ==========================================
// CUSTOMER WEBSITE
// ==========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err && !res.headersSent) {
      res.status(404).send(
        "Customer homepage not found. Please check public/index.html."
      );
    }
  });
});

app.use(express.static(PUBLIC_DIR));

// ==========================================
// ADMIN WEBSITE
// ==========================================

app.get("/admin-login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin");
  }

  res.sendFile(path.join(PUBLIC_DIR, "admin-login.html"));
});

app.get("/admin-login.css", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.css"));
});

app.get("/admin-login.js", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.js"));
});

app.get("/admin", (req, res) => {
  if (!req.session || req.session.isAdmin !== true) {
    return res.redirect("/admin-login");
  }

  res.sendFile(path.join(ADMIN_DIR, "index.html"));
});

app.get("/admin/admin.css", requireAdmin, (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.css"));
});

app.get("/admin/admin.js", requireAdmin, (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.js"));
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Hotel Woodland Deluxe"
  });
});

// ==========================================
// QR CODE DEMO
// ==========================================

app.get("/api/demo-qr", asyncRoute(async (req, res) => {
  const qrDataUrl = await QRCode.toDataURL(
    "HOTEL WOODLAND DELUXE - DEMO ONLY - NO REAL PAYMENT",
    {
      width: 220,
      margin: 2
    }
  );

  res.json({ qrDataUrl });
}));

// ==========================================
// ADMIN LOGIN
// ==========================================

app.post("/api/admin/login", asyncRoute(async (req, res) => {
  const { username, password } = req.body;

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword =
    process.env.ADMIN_PASSWORD;

  if (
    !safeEqual(username, expectedUser) ||
    !safeEqual(password, expectedPassword)
  ) {
    return res.status(401).json({
      message: "Incorrect username or password."
    });
  }

  req.session.isAdmin = true;
  req.session.adminUsername = expectedUser;

  req.session.save(err => {
    if (err) {
      return res.status(500).json({
        message: "Could not start admin session."
      });
    }

    res.json({ message: "Login successful." });
  });
}));

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("haven.sid");
    res.json({ message: "Logged out." });
  });
});

// ==========================================
// ROOMS
// ==========================================

app.get("/api/rooms", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT room_id AS RoomID,
    room_number AS RoomNumber,
    room_type AS RoomType,
    price_per_night AS PricePerNight,
    capacity AS Capacity,
    room_status AS Status
    FROM rooms ORDER BY room_number`
  );

  res.json(rows);
}));

// ==========================================
// SERVICES
// ==========================================

app.get("/api/services", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT service_id AS ServiceID,
    service_name AS ServiceName,
    description AS Description,
    service_price AS Price
    FROM services ORDER BY service_id`
  );

  res.json(rows);
}));

// ==========================================
// AVAILABLE ROOMS
// ==========================================

app.get("/api/rooms/available", asyncRoute(async (req, res) => {
  const { checkIn, checkOut, guests } = req.query;
  const guestCount = Number(guests || 1);

  if (
    !validDateRange(checkIn, checkOut) ||
    !Number.isInteger(guestCount) ||
    guestCount < 1
  ) {
    return res.status(400).json({
      message: "Enter valid check-in, check-out and guest details."
    });
  }

  const [rows] = await pool.execute(
    `SELECT rm.room_id, rm.room_number, rm.room_type,
    rm.price_per_night, rm.capacity
    FROM rooms rm
    WHERE rm.room_status = 'Available'
    AND rm.capacity >= ?
    AND NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.room_id = rm.room_id
      AND r.booking_status NOT IN ('Cancelled', 'Checked Out')
      AND r.check_in < ?
      AND r.check_out > ?
    )
    ORDER BY rm.room_number`,
    [guestCount, checkOut, checkIn]
  );

  res.json(rows);
}));

// ==========================================
// CREATE RESERVATION
// ==========================================

app.post("/api/reservations", asyncRoute(async (req, res) => {
  const {
    fullName, email, phone,
    roomId, checkIn, checkOut, guests
  } = req.body;

  const guestCount = Number(guests);

  if (
    !fullName || !email || !phone || !roomId ||
    !validDateRange(checkIn, checkOut) ||
    !Number.isInteger(guestCount) ||
    guestCount < 1
  ) {
    return res.status(400).json({
      message: "Please complete all booking details correctly."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roomRows] = await connection.execute(
      `SELECT * FROM rooms
      WHERE room_id = ?
      AND room_status = 'Available'
      FOR UPDATE`,
      [roomId]
    );

    if (!roomRows.length) {
      await connection.rollback();

      return res.status(409).json({
        message: "This room is not currently available."
      });
    }

    const room = roomRows[0];

    if (Number(room.capacity) < guestCount) {
      await connection.rollback();

      return res.status(400).json({
        message: "The selected room cannot accommodate that many guests."
      });
    }

    const [overlaps] = await connection.execute(
      `SELECT reservation_id FROM reservations
      WHERE room_id = ?
      AND booking_status NOT IN ('Cancelled', 'Checked Out')
      AND check_in < ?
      AND check_out > ?
      LIMIT 1 FOR UPDATE`,
      [roomId, checkOut, checkIn]
    );

    if (overlaps.length) {
      await connection.rollback();

      return res.status(409).json({
        message: "Sorry, this room has just been booked for those dates."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [guestRows] = await connection.execute(
      "SELECT guest_id FROM guests WHERE email = ? LIMIT 1 FOR UPDATE",
      [normalizedEmail]
    );

    let guestId;

    if (guestRows.length) {
      guestId = guestRows[0].guest_id;

      await connection.execute(
        "UPDATE guests SET full_name = ?, phone = ? WHERE guest_id = ?",
        [String(fullName).trim(), String(phone).trim(), guestId]
      );
    } else {
      const [guestResult] = await connection.execute(
        `INSERT INTO guests
        (full_name, email, phone)
        VALUES (?, ?, ?)`,
        [
          String(fullName).trim(),
          normalizedEmail,
          String(phone).trim()
        ]
      );

      guestId = guestResult.insertId;
    }

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = Number(room.price_per_night) * nights;

    const [bookingResult] = await connection.execute(
      `INSERT INTO reservations
      (guest_id, room_id, check_in, check_out, booking_status)
      VALUES (?, ?, ?, ?, 'Confirmed')`,
      [guestId, roomId, checkIn, checkOut]
    );

    await connection.execute(
      `INSERT INTO payments
      (reservation_id, amount, payment_method, payment_status, payment_date)
      VALUES (?, ?, 'UPI', 'Pending', CURDATE())`,
      [bookingResult.insertId, totalAmount]
    );

    await connection.commit();

    res.status(201).json({
      message: "Room reserved. Continue to the demo payment page.",
      reservationId: bookingResult.insertId,
      totalAmount,
      nights
    });

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}));

// ==========================================
// CUSTOMER BOOKING DETAILS
// ==========================================

app.get("/api/my-booking/:id", asyncRoute(async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `SELECT r.reservation_id, r.check_in, r.check_out,
    r.booking_date, r.booking_status,
    g.full_name, g.email,
    rm.room_number, rm.room_type, rm.price_per_night,
    p.amount, p.payment_method, p.payment_status
    FROM reservations r
    JOIN guests g ON g.guest_id = r.guest_id
    JOIN rooms rm ON rm.room_id = r.room_id
    LEFT JOIN payments p ON p.reservation_id = r.reservation_id
    WHERE r.reservation_id = ?
    AND LOWER(g.email) = ?
    LIMIT 1`,
    [req.params.id, email]
  );

  if (!rows.length) {
    return res.status(404).json({
      message: "Booking not found. Check the reservation ID and email."
    });
  }

  res.json(rows[0]);
}));

// ==========================================
// CANCEL BOOKING
// ==========================================

app.patch("/api/my-booking/:id/cancel", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT r.reservation_id, r.booking_status
      FROM reservations r
      JOIN guests g ON g.guest_id = r.guest_id
      WHERE r.reservation_id = ?
      AND LOWER(g.email) = ?
      LIMIT 1 FOR UPDATE`,
      [req.params.id, email]
    );

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Booking not found."
      });
    }

    if (rows[0].booking_status !== "Confirmed") {
      await connection.rollback();

      return res.status(400).json({
        message: "Only confirmed bookings can be cancelled."
      });
    }

    await connection.execute(
      "UPDATE reservations SET booking_status = 'Cancelled' WHERE reservation_id = ?",
      [req.params.id]
    );

    await connection.commit();

    res.json({
      message: "Booking cancelled. If a payment was made, contact the hotel about its refund policy."
    });

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}));

// ==========================================
// PAYMENT DETAILS
// ==========================================

app.get("/api/payment-details/:id", asyncRoute(async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `SELECT r.reservation_id, r.booking_status,
    r.check_in, r.check_out,
    g.full_name, g.email,
    rm.room_number, rm.room_type,
    p.amount, p.payment_method, p.payment_status
    FROM reservations r
    JOIN guests g ON g.guest_id = r.guest_id
    JOIN rooms rm ON rm.room_id = r.room_id
    JOIN payments p ON p.reservation_id = r.reservation_id
    WHERE r.reservation_id = ?
    AND LOWER(g.email) = ?
    LIMIT 1`,
    [req.params.id, email]
  );

  if (!rows.length) {
    return res.status(404).json({
      message: "Payment details not found."
    });
  }

  res.json(rows[0]);
}));

// ==========================================
// SAVE CUSTOMER PAYMENT METHOD
// ==========================================

app.post("/api/payment-method/:id", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const paymentMethod = req.body.paymentMethod;

  if (!["Cash", "Card", "UPI"].includes(paymentMethod)) {
    return res.status(400).json({
      message: "Please select Cash, Card or UPI."
    });
  }

  const [rows] = await pool.execute(
    `SELECT p.payment_id, p.payment_status
    FROM payments p
    JOIN reservations r ON r.reservation_id = p.reservation_id
    JOIN guests g ON g.guest_id = r.guest_id
    WHERE r.reservation_id = ?
    AND LOWER(g.email) = ?
    LIMIT 1`,
    [req.params.id, email]
  );

  if (!rows.length || rows[0].payment_status !== "Pending") {
    return res.status(404).json({
      message: "Payment record not found or payment is already completed."
    });
  }

  await pool.execute(
    "UPDATE payments SET payment_method = ? WHERE payment_id = ?",
    [paymentMethod, rows[0].payment_id]
  );

  res.json({
    message: "Payment method saved successfully.",
    paymentMethod
  });
}));

// ==========================================
// DEMO PAYMENT
// ==========================================

app.post("/api/payment-demo/:id", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `SELECT p.payment_id, p.payment_status, p.payment_method
    FROM payments p
    JOIN reservations r ON r.reservation_id = p.reservation_id
    JOIN guests g ON g.guest_id = r.guest_id
    WHERE r.reservation_id = ?
    AND LOWER(g.email) = ?
    LIMIT 1`,
    [req.params.id, email]
  );

  if (!rows.length) {
    return res.status(404).json({
      message: "Payment record not found."
    });
  }

  if (rows[0].payment_status === "Completed") {
    return res.json({
      message: "This payment has already been completed."
    });
  }

  if (!["UPI", "Card"].includes(rows[0].payment_method)) {
    return res.status(400).json({
      message: "Only UPI and Card demo payments can be completed online."
    });
  }

  await pool.execute(
    `UPDATE payments
    SET payment_status = 'Completed',
    payment_date = CURDATE()
    WHERE payment_id = ?`,
    [rows[0].payment_id]
  );

  res.json({
    message: "Demo payment completed successfully. No real money was transferred."
  });
}));

// ==========================================
// ADMIN DASHBOARD
// ==========================================

app.get("/api/dashboard", requireAdmin, asyncRoute(async (req, res) => {
  const [[rooms]] = await pool.query(
    "SELECT COUNT(*) AS total FROM rooms"
  );

  const [[guests]] = await pool.query(
    "SELECT COUNT(*) AS total FROM guests"
  );

  const [[reservations]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reservations"
  );

  const [[payments]] = await pool.query(
    "SELECT COUNT(*) AS pending FROM payments WHERE payment_status = 'Pending'"
  );

  res.json({
    rooms: rooms.total,
    guests: guests.total,
    reservations: reservations.total,
    pendingPayments: payments.pending
  });
}));

// ==========================================
// ADMIN RESERVATIONS
// ==========================================

app.get("/api/reservations", requireAdmin, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.reservation_id AS ReservationID,
    g.full_name AS GuestName,
    g.email AS Email,
    g.phone AS Phone,
    rm.room_number AS RoomNumber,
    rm.room_type AS RoomType,
    r.check_in AS CheckIn,
    r.check_out AS CheckOut,
    r.booking_status AS BookingStatus,
    p.amount AS Amount,
    p.payment_status AS PaymentStatus
    FROM reservations r
    JOIN guests g ON g.guest_id = r.guest_id
    JOIN rooms rm ON rm.room_id = r.room_id
    LEFT JOIN payments p ON p.reservation_id = r.reservation_id
    ORDER BY r.reservation_id DESC`
  );

  res.json(rows);
}));

// ==========================================
// ADMIN PAYMENTS
// ==========================================

app.get("/api/payments", requireAdmin, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.payment_id AS PaymentID,
    p.reservation_id AS ReservationID,
    g.full_name AS GuestName,
    g.email AS Email,
    p.amount AS Amount,
    p.payment_date AS PaymentDate,
    p.payment_method AS PaymentMethod,
    p.payment_status AS PaymentStatus
    FROM payments p
    JOIN reservations r ON r.reservation_id = p.reservation_id
    JOIN guests g ON g.guest_id = r.guest_id
    ORDER BY p.payment_id DESC`
  );

  res.json(rows);
}));

// ==========================================
// ADMIN GUESTS
// ==========================================

app.get("/api/guests", requireAdmin, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT guest_id AS GuestID,
    full_name AS FullName,
    email AS Email,
    phone AS Phone
    FROM guests ORDER BY guest_id DESC`
  );

  res.json(rows);
}));

// ==========================================
// ADMIN ROOM MANAGEMENT
// ==========================================

app.post("/api/rooms", requireAdmin, asyncRoute(async (req, res) => {
  const { roomNumber, roomType, pricePerNight, capacity } = req.body;

  if (
    !roomNumber || !roomType ||
    !Number.isFinite(Number(pricePerNight)) ||
    Number(pricePerNight) < 0 ||
    !Number.isInteger(Number(capacity)) ||
    Number(capacity) < 1
  ) {
    return res.status(400).json({
      message: "Enter valid room details."
    });
  }

  await pool.execute(
    `INSERT INTO rooms
    (room_number, room_type, price_per_night, capacity, room_status)
    VALUES (?, ?, ?, ?, 'Available')`,
    [roomNumber, roomType, Number(pricePerNight), Number(capacity)]
  );

  res.status(201).json({
    message: "Room added."
  });
}));

app.patch("/api/rooms/:id/status", requireAdmin, asyncRoute(async (req, res) => {
  const { status } = req.body;

  if (!["Available", "Maintenance", "Unavailable"].includes(status)) {
    return res.status(400).json({
      message: "Invalid room status."
    });
  }

  const [result] = await pool.execute(
    "UPDATE rooms SET room_status = ? WHERE room_id = ?",
    [status, req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Room not found."
    });
  }

  res.json({
    message: "Room status updated."
  });
}));

// ==========================================
// ADMIN SERVICE MANAGEMENT
// ==========================================

app.post("/api/services", requireAdmin, asyncRoute(async (req, res) => {
  const { serviceName, description, servicePrice } = req.body;

  if (
    !serviceName ||
    !Number.isFinite(Number(servicePrice)) ||
    Number(servicePrice) < 0
  ) {
    return res.status(400).json({
      message: "Enter valid service details."
    });
  }

  await pool.execute(
    `INSERT INTO services
    (service_name, description, service_price)
    VALUES (?, ?, ?)`,
    [serviceName, description || "", Number(servicePrice)]
  );

  res.status(201).json({
    message: "Service added."
  });
}));

// ==========================================
// ADMIN RESERVATION MANAGEMENT
// ==========================================

app.patch("/api/reservations/:id/status", requireAdmin, asyncRoute(async (req, res) => {
  const { status } = req.body;

  if (!["Confirmed", "Cancelled", "Checked In", "Checked Out"].includes(status)) {
    return res.status(400).json({
      message: "Invalid booking status."
    });
  }

  const [result] = await pool.execute(
    "UPDATE reservations SET booking_status = ? WHERE reservation_id = ?",
    [status, req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Reservation not found."
    });
  }

  res.json({
    message: "Reservation status updated."
  });
}));

// ==========================================
// ADMIN PAYMENT MANAGEMENT
// ==========================================

app.patch("/api/payments/:id", requireAdmin, asyncRoute(async (req, res) => {
  const { status } = req.body;

  if (!["Pending", "Completed", "Refunded"].includes(status)) {
    return res.status(400).json({
      message: "Invalid payment status."
    });
  }

  const [result] = await pool.execute(
    `UPDATE payments
    SET payment_status = ?,
    payment_date = IF(? = 'Completed', CURDATE(), payment_date)
    WHERE payment_id = ?`,
    [status, status, req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Payment not found."
    });
  }

  res.json({
    message: "Payment status updated."
  });
}));

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
  console.error(error);

  if (error && error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "That room number or email already exists."
    });
  }

  res.status(500).json({
    message: "Something went wrong on the server. Check the terminal for details."
  });
});

// ==========================================
// 404 PAGE
// ==========================================

app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// ==========================================
// START SERVER
// ==========================================

async function start() {
  try {
    await pool.query("SELECT 1");

    console.log("Connected to MySQL database.");

    app.listen(PORT, () => {
      console.log(`Hotel Woodland Deluxe is running at http://localhost:${PORT}`);
      console.log(`Customer website: http://localhost:${PORT}/`);
      console.log(`Admin login: http://localhost:${PORT}/admin-login`);
    });

  } catch (error) {
    console.error(
      "Could not connect to MySQL. Check your .env settings and database.",
      error.message
    );

    process.exit(1);
  }
}

start();
