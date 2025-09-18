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
  "https://nexly-git-master-guido-fs-projects.vercel.app"
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

app.options("*", cors());

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || "");
    },
  })
);
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/webhook", verifyMetaSignature, webhookRouter);
app.use("/contacts", contactsRouter); 
app.use("/integrations", integrationsRouter);
app.use("/messages", messageRoutes);

app.listen(PORT, '0.0.0.0', () => console.log('up', PORT));