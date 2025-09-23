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
  "https://nexly-93kgcbsuy-guido-fs-projects.vercel.app",
  "https://nexly-git-master-guido-fs-projects.vercel.app",
  "https://nexly-topaz.vercel.app",
  "https://www.nexly.com.ar" // nuevo dominio agregado
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.options(/.*/, cors());

// Validate webhook origins
app.use(validateWebhookOrigin);

// Sanitize payment data
app.use(sanitizePaymentData);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || "");
    },
  })
);

const PORT = Number(process.env.PORT) || 4000;

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/webhook", webhookRouter);
app.use("/contacts", contactsRouter);
app.use("/integrations", integrationsRouter);
app.use("/messages", messageRoutes);
app.use("/subscriptions", subscriptionsRouter);
app.use("/stripe", stripeRouter);
app.use("/ai", aiRouter);
app.use("/analytics", analyticsRouter);
app.use("/stripe/webhook", stripeWebhookRouter);
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
