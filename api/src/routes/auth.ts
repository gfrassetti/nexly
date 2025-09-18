// src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { config } from "../config";

const router = Router();

// Registro
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: email.toLowerCase(),
      username: username.trim(),
      password: hashedPassword,
      role: "user",
      tenantId: email.toLowerCase(),
    });

    await user.save();

    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (err: any) {
     console.error("REGISTER error:", err);
     res.status(500).json({ message: "Error en el registro", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    
    const { identifier, email, username, password } = req.body;
    const key = (identifier ?? email ?? username ?? "").trim();

    if (!key || !password) {
      return res
        .status(400)
        .json({ message: "Usuario/Email y contraseña son requeridos" });
    }

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const q = new RegExp(`^${escapeRegex(key)}$`, "i");

    const user = await User.findOne({
      $or: [{ username: q }, { email: q }],
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 👇 payload consistente para middleware
    const token = jwt.sign({ id: user._id.toString() }, config.jwtSecret, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN error:", err);
    res.status(500).json({ message: "Error en el login" });
  }
});

export default router;
