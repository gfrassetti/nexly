import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || "4000",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return "dev-secret-change-in-production";
  })(),
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
  
  // Mercado Pago Configuration
  mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
  mercadoPagoBaseUrl: process.env.MERCADOPAGO_BASE_URL || "https://api.mercadopago.com",
  
  // Google AI Configuration
  googleAIApiKey: process.env.GOOGLE_AI_API_KEY || "",
  
  // Email Configuration
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
  
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
};
