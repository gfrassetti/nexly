// web/src/lib/api.ts
// ------------------------------------------------------
// Base URL y utilidades de red con token (Authorization)
// ------------------------------------------------------

/**
 * Debe apuntar a tu backend en Railway:
 *   NEXT_PUBLIC_API_URL=https://<tu-app>.up.railway.app
 * En local: http://localhost:4000
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
  .replace(/\/+$/, "");

export const apiPath = (p: string) => `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;

// -------- token helpers (cliente) ---------------------------------

/** Intenta leer el token desde cookie "token" (en cliente) */
export function getCookieToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Permite forzar un token o caer al cookie */
export function resolveToken(override?: string) {
  return override || getCookieToken();
}

// -------- fetch helpers -------------------------------------------

/**
 * apiFetch: wrapper de fetch con:
 * - Base URL
 * - Headers JSON
 * - Authorization: Bearer <token> (si hay)
 * - Manejo de error coherente
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string
): Promise<T> {
  const token = resolveToken(tokenOverride);

  const res = await fetch(apiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    // Importante si usas cookies/sesiones del mismo dominio:
    // credentials: "include",
  });

  if (!res.ok) {
    // 🚨 MANEJO ESPECIAL PARA TOKEN EXPIRADO (401)
    if (res.status === 401) {
      console.warn('🔒 Token expirado detectado en:', path);
      console.warn('📅 Timestamp:', new Date().toISOString());
      
      // Logout automático directo
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      sessionStorage.clear();
      
      console.warn('🚀 Ejecutando logout automático...');
      
      // Redirigir al login
      window.location.replace("/login");
      
      throw new Error("Sesión expirada. Redirigiendo al login...");
    }
    
    // Manejo normal de otros errores HTTP
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ------------------------------------------------------
// Endpoints de AUTENTICACIÓN
// ------------------------------------------------------

export function registerApi(body: {
  username: string;
  email: string;
  password: string;
  plan?: string;
}) {
  return apiFetch<{ message: string; token?: string; user?: unknown }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginApi(body: {
  identifier?: string;
  email?: string;
  username?: string;
  password: string;
}) {
  return apiFetch<{
    token: string;
    user: { id: string; username: string; email: string };
  }>("/auth/login", { method: "POST", body: JSON.stringify(body) });
}

// ------------------------------------------------------
// Endpoints de CONTACTOS / MENSAJES
// ------------------------------------------------------

export type Provider = "whatsapp" | "instagram" | "messenger" | "telegram" | "tiktok";

export function getContacts(token?: string) {
  return apiFetch<unknown[]>("/contacts", { method: "GET" }, token);
}

/**
 * Crear contacto manual (si lo mantenés). Si tu backend
 * agrega el integrationId por webhook/sync, podés omitirlo.
 */
export function createContact(body: {
  name?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  provider?: Provider;
  integrationId?: string;
}, token?: string) {
  return apiFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  }, token);
}

/**
 * Eliminar contacto
 */
export function deleteContact(contactId: string, token?: string) {
  return apiFetch(`/contacts/${contactId}`, {
    method: "DELETE",
  }, token);
}

/**
 * Sincronizar todos los contactos del usuario
 */
export function syncAllContacts(token?: string) {
  return apiFetch<{
    success: boolean;
    message: string;
    results: Array<{
      success: boolean;
      provider: string;
      contactsSynced: number;
      contactsCreated: number;
      contactsUpdated: number;
      error?: string;
    }>;
    summary: {
      totalSynced: number;
      totalCreated: number;
      totalUpdated: number;
    };
  }>("/contacts/sync", {
    method: "POST",
  }, token);
}

/**
 * Sincronizar contactos de una integración específica
 */
export function syncIntegrationContacts(integrationId: string, token?: string) {
  return apiFetch<{
    success: boolean;
    message: string;
    result: {
      success: boolean;
      provider: string;
      contactsSynced: number;
      contactsCreated: number;
      contactsUpdated: number;
      error?: string;
    };
  }>(`/contacts/sync/${integrationId}`, {
    method: "POST",
  }, token);
}

/**
 * Sincronizar contactos por provider (telegram, whatsapp, etc.)
 */
export function syncProviderContacts(provider: string, token?: string) {
  return apiFetch<{
    success: boolean;
    message: string;
    result: {
      success: boolean;
      provider: string;
      contactsSynced: number;
      contactsCreated: number;
      contactsUpdated: number;
      error?: string;
    };
  }>(`/contacts/sync/provider/${provider}`, {
    method: "POST",
  }, token);
}

export function getMessages(params: { contactId?: string; provider?: Provider; integrationId?: string } = {}) {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  if (params.integrationId) q.set("integrationId", params.integrationId);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<unknown[]>(`/messages${suffix}`);
}

/**
 * Obtener timeline de mensajes de los últimos 7 días
 */
export function getMessagesTimeline(token?: string) {
  return apiFetch<{
    success: boolean;
    data: Array<{
      date: string;
      sent: number;
      received: number;
    }>;
  }>("/analytics/messages-timeline", { method: "GET" }, token);
}

export function sendMessageApi(body: {
  provider: Provider;
  to?: string;
  body?: string;         // alias de message
  message?: string;      // permitido
  contactId?: string;
}) {
  // normalizamos body/message
  const payload = { ...body, body: body.body ?? body.message };
  return apiFetch("/messages/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ------------------------------------------------------
// Endpoints de INTEGRACIONES
// ------------------------------------------------------

export type IntegrationDto = {
  _id: string;
  userId: string;
  provider: Provider;
  externalId: string;
  phoneNumberId?: string;
  accessToken?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
};

export function listIntegrations() {
  return apiFetch<IntegrationDto[]>("/integrations", { method: "GET" });
}

/**
 * Vincular integración (modo demo: tu endpoint crea/actualiza)
 * - En producción, pedirás phoneNumberId y accessToken reales.
 */
export function linkIntegration(body: {
  provider: Provider;
  externalId: string;
  phoneNumberId?: string;
  accessToken?: string;
  name?: string;
}) {
  return apiFetch<IntegrationDto>("/integrations/link", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Obtener instrucciones para conectar WhatsApp Business
 */
export function connectWhatsApp(token?: string) {
  return apiFetch<{ 
    success: boolean;
    message: string; 
    signupUrl?: string;
    instructions: {
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      step5?: string;
    }
  }>("/integrations/connect/whatsapp", {
    method: "GET",
  }, token);
}

/**
 * Conectar WhatsApp Business usando credenciales de Meta
 */
export function connectWhatsAppCredentials(body: {
  phoneNumberId: string;
  accessToken: string;
  phoneNumber?: string;
}, token?: string) {
  return apiFetch<{
    success: boolean;
    message: string;
    integration: {
      _id: string;
      provider: string;
      name: string;
      status: string;
      phoneNumberId: string;
    };
  }>("/integrations/whatsapp/credentials", {
    method: "POST",
    body: JSON.stringify(body),
  }, token);
}

/**
 * Enviar mensaje de WhatsApp
 */
export function sendWhatsAppMessage(body: {
  to: string;
  message: string;
}) {
  return apiFetch<{
    success: boolean;
    messageId: string;
    response: unknown;
  }>("/integrations/send-whatsapp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// AI Functions
export function analyzeMessage(message: string, context?: string) {
  const token = localStorage.getItem("token");
  return apiFetch<{
    success: boolean;
    analysis: {
      sentiment: 'positive' | 'negative' | 'neutral';
      category: 'sales' | 'support' | 'complaint' | 'general';
      suggestedResponse?: string;
      confidence: number;
    };
  }>("/ai/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ message, context }),
  });
}

export function generateResponse(message: string, businessContext?: string) {
  const token = localStorage.getItem("token");
  return apiFetch<{
    success: boolean;
    response: string;
  }>("/ai/generate-response", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ message, businessContext }),
  });
}

export function classifyUrgency(message: string) {
  const token = localStorage.getItem("token");
  return apiFetch<{
    success: boolean;
    urgency: 'low' | 'medium' | 'high';
  }>("/ai/classify-urgency", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ message }),
  });
}

export default apiFetch;

