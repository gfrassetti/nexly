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
export async function apiFetch<T = any>(
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
}) {
  return apiFetch<{ message: string }>("/auth/register", {
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

export type Provider = "whatsapp" | "instagram" | "messenger";

export function getContacts() {
  return apiFetch<any[]>("/contacts", { method: "GET" });
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
}) {
  return apiFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMessages(params: { contactId?: string; provider?: Provider; integrationId?: string } = {}) {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  if (params.integrationId) q.set("integrationId", params.integrationId);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<any[]>(`/messages${suffix}`);
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
 * Iniciar flujo OAuth para conectar WhatsApp
 */
export function connectWhatsApp() {
  return apiFetch<{ authUrl: string; state: string }>("/integrations/connect/whatsapp", {
    method: "GET",
  });
}

export default apiFetch;

