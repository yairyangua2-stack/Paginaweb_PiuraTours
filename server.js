// server.js
const path = require("path");
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// === Conexión a PostgreSQL ===
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error("❌ Error conectando a PostgreSQL:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Conectado a PostgreSQL");
  }
});

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Archivos estáticos (RUTA ABSOLUTA con path.join) ===
app.use(express.static(path.join(__dirname, "html")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/video", express.static(path.join(__dirname, "video")));

// === Ruta raíz EXPLÍCITA (fallback) ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html/index.html"));
});

// === RUTAS DE API ===
const JWT_SECRET = process.env.JWT_SECRET || "mi_clave_secreta";

// Registro
app.post("/api/registro", async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  try {
    const existente = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email],
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email",
      [nombre, email, hashed],
    );
    const token = jwt.sign({ id: result.rows[0].id, email }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(201).json({ token, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Middleware para verificar token
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Acceso denegado" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.usuarioId = decoded.id;
    next();
  });
}

// Destinos
app.get("/api/destinos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM destinos ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener destinos" });
  }
});

app.get("/api/destinos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM destinos WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Destino no encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el destino" });
  }
});

// Mensajes (protegido)
app.post("/api/mensajes", verificarToken, async (req, res) => {
  const { nombre, email, comentario } = req.body;
  if (!nombre || !email || !comentario) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO mensajes (nombre, email, comentario) VALUES ($1, $2, $3) RETURNING *",
      [nombre, email, comentario],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar mensaje" });
  }
});

// Solicitudes (protegido)
app.post("/api/solicitudes", verificarToken, async (req, res) => {
  const { nombre, descripcion, ubicacion, categoria, email } = req.body;
  if (!nombre || !descripcion || !ubicacion || !categoria) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO solicitudes (nombre, descripcion, ubicacion, categoria, email_usuario)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, descripcion, ubicacion, categoria, email],
    );
    res
      .status(201)
      .json({ mensaje: "Solicitud enviada", solicitud: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar la solicitud" });
  }
});

// === Inicio del servidor ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});



