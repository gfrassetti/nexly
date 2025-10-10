import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/connect";
import healthRouter from "./routes/health";
import webhookRouter from "./routes/webhook";
import authRouter from "./routes/auth";
import requireAuth from "./middleware/auth";
import contactsRouter from "./routes/contacts";
import integrationsRouter from "./routes/integrations";
import telegramRouter from "./routes/telegram";
import analyticsRouter from "./routes/analytics";
import { verifyMetaSignature } from "./middleware/verifyMetaSignature";
import messageRoutes from "./routes/messages";
import conversationsRouter from "./routes/conversations";
import subscriptionsRouter from "./routes/subscriptions";
import stripeRouter from "./routes/stripe";
import aiRouter from "./routes/ai";
import stripeWebhookRouter from "./routes/stripe/webhook";
import stripePauseRouter from "./routes/stripe/pause";
import loggerTestRouter from "./routes/loggerTest";
import twilioWebhookRouter from "./routes/twilioWebhook";
import { 
  generalRateLimit, 
  paymentRateLimit, 
  subscriptionRateLimit,
  securityHeaders, 
  validateWebhookOrigin,
  sanitizePaymentData 
} from "./middleware/security";
import { errorHandler } from "./utils/errorHandler";
import logger from "./utils/logger";
import { requestLogging, integrationLogging, errorLogging } from "./middleware/logging";

dotenv.config();

const app = express();

// Trust proxy for Railway (fixes X-Forwarded-For header issue)
app.set('trust proxy', 1);

// Request logging middleware (early in the chain)
app.use(requestLogging);

// Security headers
app.use(securityHeaders);

// Rate limiting general
app.use(generalRateLimit);

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://www.nexly.com.ar", // nuevo dominio agregado
  "https://nexly.com.ar", // sin www también
  "https://nexly-production.up.railway.app" // permitir el mismo dominio del backend
];

app.use(cors({
  origin(origin, cb) {
    
    if (!origin) {
      return cb(null, true);
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// CORS is already configured above, no need for additional options handling

// Middleware adicional para manejar CORS de manera más permisiva temporalmente
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Permitir CORS para requests de preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware para parsear JSON (excepto webhooks de Stripe)
// IMPORTANTE: Este middleware debe ir ANTES de cualquier otro middleware de parsing
app.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    // Para webhooks de Stripe, usar raw body
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // Para otros endpoints, usar JSON parsing normal
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || "");
      },
    })(req, res, next);
  }
});

const PORT = Number(process.env.PORT) || 4000;

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/webhook", validateWebhookOrigin, webhookRouter);
app.use("/contacts", contactsRouter);
app.use("/integrations", integrationLogging, integrationsRouter);
app.use("/telegram", requireAuth, telegramRouter);
app.use("/analytics", requireAuth, analyticsRouter);
app.use("/messages", messageRoutes);
app.use("/conversations", conversationsRouter);
app.use("/subscriptions", subscriptionRateLimit, sanitizePaymentData, subscriptionsRouter);
app.use("/stripe", sanitizePaymentData, stripeRouter);
app.use("/ai", aiRouter);
app.use("/stripe/webhook", validateWebhookOrigin, stripeWebhookRouter);
app.use("/stripe/pause", stripePauseRouter);
app.use("/loggerTest", loggerTestRouter);
app.use("/twilio-webhook", twilioWebhookRouter);

// Endpoint raíz
app.get("/", (req, res) => {
  res.json({
    message: "Nexly API is running",
    version: "1.0.0",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de rutas no encontradass
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: [
      "/health",
      "/auth",
      "/webhook", 
      "/twilio-webhook",
      "/contacts",
      "/integrations",
      "/messages",
      "/conversations",
      "/subscriptions",
      "/stripe",
      "/ai",
      "/analytics"
    ]
  });
});

// Error logging middleware
app.use(errorLogging);

// Error handler (debe ir al final)
app.use(errorHandler);

// 👇 conectar DB primero, después arrancar server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("✅ up", PORT);
      logger.info("Server started", {
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
  })
  .catch((err) => {
    logger.error("Database connection failed", {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });

export default app;