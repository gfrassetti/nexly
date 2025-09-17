import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/db/connect";
import healthRouter from "./src/routes/health";
import webhookRouter from "./src/routes/webhook";
import authRouter from "./src/routes/auth";
import contactsRouter from "./src/routes/contacts";
import integrationsRouter from "./src/routes/integrations";
import verifyMetaSignature from "./src/middleware/verifyMetaSignature";
import messageRoutes from "./src/routes/messages";



dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
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