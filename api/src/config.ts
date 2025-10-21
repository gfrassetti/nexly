import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || "4000",
  mongoUri: process.env.MONGO_URI || "",
  redisUrl: process.env.REDIS_URL || "", // Redis para cache de alta performance
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return "dev-secret-change-in-production";
  })(),
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  
  // Meta App Configuration (usando los nombres de Railway)
  metaAppId: process.env.META_APP_ID || "", // Necesitas agregar esta en Railway
  metaAppSecret: process.env.META_APP_SECRET || "",
  metaConfigId: process.env.META_CONFIG_ID, // ID de configuración de Meta
  metaVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "", // Usando WEBHOOK_VERIFY_TOKEN
  
  // URLs
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  
  // Variables específicas de Railway
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
  metaWabaId: process.env.META_WABA_ID || "",
  
  // Nexly Facebook Business Manager ID (para Embedded Signup)
  // TEMPORAL: Reemplaza con tu Facebook Business Manager ID real
  nexlyFacebookBusinessId: process.env.NEXLY_FACEBOOK_BUSINESS_ID,
  
  
  // Twilio Configuration
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "AC8cee5d9e364a2931a091a96a645dee76",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
  
  // Telegram MTProto Configuration
  telegramApiId: process.env.TELEGRAM_API_ID || "",
  telegramApiHash: process.env.TELEGRAM_API_HASH || "",
  
  // Discord OAuth2 Configuration
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI || "http://localhost:3000/dashboard/integrations/connect/discord/callback",
  
  
  // Stripe Configuration
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  
  // Product IDs para planes de suscripción
  stripeBasicProductId: process.env.STRIPE_BASIC_PRODUCT_ID || "",
  stripeBasicPriceId: process.env.STRIPE_BASIC_PRICE_ID || "",
  
  stripePremiumProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID || "",
  stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || "",
  
  stripeEnterpriseProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || "",
  stripeEnterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
  
  // Add-on Product ID (ya configurado)
  stripeAddOnProductId: process.env.STRIPE_ADDON_PRODUCT_ID || "prod_TEO3LGlL9aLx2F",
  stripeAddOnPriceId: process.env.STRIPE_ADDON_PRICE_ID || "",
  
  // Google AI Configuration
  googleAIApiKey: process.env.GOOGLE_AI_API_KEY || "",
  
  // Email Configuration (SendGrid)
  sendGridApiKey: process.env.SENDGRID_API_KEY || "",
  
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  
  // Integration Limits
  freeTrialMaxIntegrations: 2,
  freeTrialAllowedProviders: ["whatsapp", "instagram", "telegram"],
};
