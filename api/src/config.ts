import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || "4000",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "changeme",
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "verifytoken",
  
  // Meta App Configuration (usando los nombres de Railway)
  metaAppId: process.env.META_APP_ID || "", // Necesitas agregar esta en Railway
  metaAppSecret: process.env.META_APP_SECRET || "",
  metaVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "", // Usando WEBHOOK_VERIFY_TOKEN
  
  // URLs
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  
  // Variables específicas de Railway
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
  metaWabaId: process.env.META_WABA_ID || "",
};
