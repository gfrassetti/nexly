// Integraciones y canales disponibles
export const CHANNELS = ["whatsapp", "instagram", "messenger", "telegram"] as const;
export type Channel = typeof CHANNELS[number];

export const INTEGRATIONS = [
  { 
    id: "whatsapp", 
    label: "WhatsApp", 
    color: "bg-green-500",
    description: "Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes."
  },
  { 
    id: "instagram", 
    label: "Instagram", 
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    description: "Conecta tu cuenta de Instagram para gestionar mensajes directos."
  },
  { 
    id: "messenger", 
    label: "Facebook Messenger", 
    color: "bg-blue-500",
    description: "Conecta Facebook Messenger para gestionar conversaciones."
  },
  { 
    id: "tiktok", 
    label: "TikTok", 
    color: "bg-black",
    description: "Conecta TikTok para gestionar mensajes y comentarios."
  },
  { 
    id: "telegram", 
    label: "Telegram", 
    color: "bg-blue-500",
    description: "Conecta tu cuenta personal de Telegram para gestionar todos tus chats y mensajes."
  },
] as const;

export type Integration = typeof INTEGRATIONS[number];

// Planes de suscripción
export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Plan Básico",
    maxIntegrations: 2,
    price: 29,
  },
  premium: {
    name: "Plan Premium", 
    maxIntegrations: 999, // Sin límite
    price: 59,
  },
} as const;

export type PlanType = keyof typeof SUBSCRIPTION_PLANS;

// Estados de suscripción
export const SUBSCRIPTION_STATUS = {
  none: "none",
  trial_pending_payment_method: "trial_pending_payment_method",
  active_trial: "active_trial",
  active_paid: "active_paid",
  cancelled: "cancelled",
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// Configuración de la aplicación
export const APP_CONFIG = {
  trialDays: 7,
  gracePeriodDays: 7,
  maxMessageLength: 4096,
  defaultChannel: "whatsapp" as Channel,
} as const;

// Colores de plataforma para UI
export const PLATFORM_COLORS = {
  whatsapp: "bg-green-500",
  instagram: "bg-pink-500", 
  messenger: "bg-blue-500",
  tiktok: "bg-black",
  telegram: "bg-blue-500",
  default: "bg-neutral-500",
} as const;

// Iconos de plataforma
export const PLATFORM_ICONS = {
  whatsapp: "📱",
  instagram: "📸",
  messenger: "💬",
  tiktok: "🎵",
  telegram: "✈️",
  default: "📞",
} as const;
