import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/connect";
import healthRouter from "./routes/health";
import webhookRouter from "./routes/webhook";
import authRouter from "./routes/auth";
import contactsRouter from "./routes/contacts";
import integrationsRouter from "./routes/integrations";
import { verifyMetaSignature } from "./middleware/verifyMetaSignature";
import messageRoutes from "./routes/messages";
import subscriptionsRouter from "./routes/subscriptions";
import stripeRouter from "./routes/stripe";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";
import stripeWebhookRouter from "./routes/stripe/webhook";
import stripePauseRouter from "./routes/stripe/pause";
import { 
  generalRateLimit, 
  paymentRateLimit, 
  subscriptionRateLimit,
  securityHeaders, 
  validateWebhookOrigin,
  sanitizePaymentData 
} from "./middleware/security";
import { errorHandler } from "./utils/errorHandler";

dotenv.config();

const app = express();

// Trust proxy for Railway (fixes X-Forwarded-For header issue)
app.set('trust proxy', 1);

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
    console.log("🔍 CORS check - Origin:", origin);
    console.log("🔍 CORS check - Allowed origins:", ALLOWED_ORIGINS);
    
    if (!origin) {
      console.log("🔍 CORS check - No origin, allowing");
      return cb(null, true);
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      console.log("🔍 CORS check - Origin allowed:", origin);
      return cb(null, true);
    }
    
    console.log("🔍 CORS check - Origin NOT allowed:", origin);
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
  console.log("🔍 Request origin:", origin);
  console.log("🔍 Request method:", req.method);
  console.log("🔍 Request path:", req.path);
  
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
app.use("/integrations", integrationsRouter);
app.use("/messages", messageRoutes);
app.use("/subscriptions", subscriptionRateLimit, sanitizePaymentData, subscriptionsRouter);
app.use("/stripe", sanitizePaymentData, stripeRouter);
app.use("/ai", aiRouter);
app.use("/analytics", analyticsRouter);
app.use("/stripe/webhook", validateWebhookOrigin, stripeWebhookRouter);
app.use("/stripe/pause", stripePauseRouter);

// Error handler (debe ir al final)
app.use(errorHandler);

// 👇 conectar DB primero, después arrancar server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log("✅ up", PORT));
  })
  .catch((err) => {
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });

export default app;