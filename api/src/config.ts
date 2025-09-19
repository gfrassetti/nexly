import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || "4000",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "changeme",
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "verifytoken",
  
  // Meta App Configuration
  metaAppId: process.env.META_APP_ID || "",
  metaAppSecret: process.env.META_APP_SECRET || "",
  metaVerifyToken: process.env.META_VERIFY_TOKEN || "",
  
  // URLs
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  
  // Global opcional (fallback si la integración no trae accessToken)
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
};
