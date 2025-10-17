// src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User";
import { config } from "../config";
import { emailService } from "../services/emailService";
import { logAuthActivity, logAuthError } from "../utils/logger";

const router = Router();

// Registro
router.post("/register", async (req, res) => {
  try {
    const { email, password, username, plan } = req.body;

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

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Email o username ya está en uso" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: email.toLowerCase(),
      username: username.trim(),
      password: hashedPassword,
      role: "user",
      tenantId: email.toLowerCase(),
      selectedPlan: plan && (plan === 'crecimiento' || plan === 'pro' || plan === 'business') ? plan : 'crecimiento',
    });

    await user.save();

    // Log successful registration
    logAuthActivity('user_registered', user._id.toString(), {
      username: user.username,
      email: user.email,
      plan: plan || 'crecimiento'
    });

    // Si hay un plan válido, establecer estado pendiente de pago y crear el token para auto-login
    if (plan && (plan === 'crecimiento' || plan === 'pro' || plan === 'business')) {
      // Establecer estado pendiente de método de pago
      user.subscription_status = 'trial_pending_payment_method';
      await user.save();

      const token = jwt.sign(
        { id: user._id.toString() },
        config.jwtSecret,
        { expiresIn: "24h" }
      );

      return res.status(201).json({ 
        message: "Usuario registrado exitosamente",
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          subscription_status: user.subscription_status
        },
        plan
      });
    }

    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (err: any) {
    logAuthError(err, 'register', undefined, {
      email: req.body.email,
      username: req.body.username,
      plan: req.body.plan
    });
    console.error("REGISTER error:", err);
    res
      .status(500)
      .json({
        message: "Error en el registro",
        error: err.message,
        stack: err.stack,
      });
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

    // Log successful login
    logAuthActivity('login_success', user._id.toString(), {
      username: user.username,
      email: user.email,
      loginMethod: identifier ? 'identifier' : email ? 'email' : 'username'
    });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err: any) {
    logAuthError(err, 'login', undefined, {
      identifier: req.body.identifier || req.body.email || req.body.username
    });
    console.error("LOGIN error:", err);
    res.status(500).json({ message: "Error en el login" });
  }
});

// Verificar token
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const token = authHeader.substring(7);
    
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    
    // Buscar el usuario
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        subscription_status: user.subscription_status || 'none',
      },
    });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }
    console.error("VERIFY error:", err);
    res.status(500).json({ message: "Error verificando token" });
  }
});

// Solicitar recupero de contraseña
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email es requerido" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({ message: "Si el email existe, recibirás un enlace de recuperación" });
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en el usuario
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Crear URL de recuperación
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    
    // Enviar email de recuperación
    const emailSent = await emailService.sendPasswordResetEmail(email, resetUrl);
    
    if (emailSent) {
      console.log(`✅ Password reset email sent to ${email}`);
      res.json({ 
        message: "Si el email existe, recibirás un enlace de recuperación"
      });
    } else {
      console.log(`⚠️ Email service not configured. Reset URL for ${email}: ${resetUrl}`);
      res.json({ 
        message: "Si el email existe, recibirás un enlace de recuperación",
        // Solo para desarrollo cuando el email no está configurado
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });
    }

  } catch (error) {
    console.error("FORGOT-PASSWORD error:", error);
    res.status(500).json({ message: "Error procesando solicitud" });
  }
});

// Resetear contraseña
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar usuario
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: "Contraseña actualizada exitosamente" });

  } catch (error) {
    console.error("RESET-PASSWORD error:", error);
    res.status(500).json({ message: "Error actualizando contraseña" });
  }
});

export default router;
