import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || "4000",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "changeme",
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "verifytoken",
  // Global opcional (fallback si la integración no trae accessToken)
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
  metaAppSecret: process.env.META_APP_SECRET || "",
};
