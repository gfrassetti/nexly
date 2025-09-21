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

dotenv.config();

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://nexly-93kgcbsuy-guido-fs-projects.vercel.app",
  "https://nexly-git-master-guido-fs-projects.vercel.app",
  "https://nexly-topaz.vercel.app"
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

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || "");
    },
  })
);

const PORT = Number(process.env.PORT) || 4000;

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/webhook", verifyMetaSignature, webhookRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/messages", messageRoutes);

// 👇 conectar DB primero, después arrancar server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log("✅ up", PORT));
  })
  .catch((err) => {
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });
