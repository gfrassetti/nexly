// src/lib/api.ts

// ==== Base URL ====
// Usa NEXT_PUBLIC_API_URL para producción (Railway), con fallback a localhost.
// Quita cualquier barra final para evitar // en las rutas.
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

// Une base + path sin generar doble slash
export const apiPath = (p: string) =>
  `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;

// ==== Helpers de Auth/Fetch ====
function authHeaders(token?: string): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchJson<T>(
  path: string,
  opts: RequestInit = {},
  token?: string
) {
  const res = await fetch(apiPath(path), {
    ...opts,
    headers: { ...authHeaders(token), ...(opts.headers || {}) },
  });
  return handle<T>(res);
}

// ==== Tipos comunes ====
export type Provider = "whatsapp" | "instagram" | "messenger";

// ==== Auth ====
// Registro
export const registerApi = (body: {
  username: string;
  email: string;
  password: string;
}) =>
  fetchJson<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

// Login (acepta identifier o email/username)
export const loginApi = (body: {
  identifier?: string;
  email?: string;
  username?: string;
  password: string;
}) =>
  fetchJson<{
    token: string;
    user: { id: string; username: string; email: string };
  }>("/auth/login", { method: "POST", body: JSON.stringify(body) });

// ==== Contacts ====
// Crear contacto (usa token)
export const createContact = (
  token: string,
  body: {
    name?: string;
    phone: string;
    email?: string;
    tags?: string[];
    // opcionales si querés relacionarlo a un canal/alias
    provider?: Provider;
    integrationId?: string;
  }
) => fetchJson("/contacts", { method: "POST", body: JSON.stringify(body) }, token);

// Listar contactos (con filtro opcional por integrationId o provider)
export const getContacts = (
  token: string,
  params?: { integrationId?: string; provider?: Provider }
) => {
  const q = new URLSearchParams();
  if (params?.integrationId) q.set("integrationId", params.integrationId);
  if (params?.provider) q.set("provider", params.provider);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return fetchJson<any[]>(`/contacts${suffix}`, { method: "GET" }, token);
};

// Actualizar contacto
export const updateContact = (
  token: string,
  id: string,
  body: Partial<{ name: string; phone: string; email: string; tags: string[] }>
) =>
  fetchJson(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);

// Eliminar contacto
export const deleteContact = (token: string, id: string) =>
  fetchJson(`/contacts/${id}`, { method: "DELETE" }, token);

// ==== Messages ====
// Enviar mensaje saliente
export const sendMessageApi = (
  token: string,
  body: {
    provider: Provider;
    // dos alternativas:
    to?: string;         // número/destino libre
    contactId?: string;  // ó a partir de un contacto existente
    body?: string;       // alias de message
    message?: string;
  }
) =>
  fetchJson(
    "/messages/send",
    { method: "POST", body: JSON.stringify(body) },
    token
  );

// Listar mensajes (por contacto y/o por proveedor)
export const getMessages = (
  token: string,
  params: { contactId?: string; provider?: Provider } = {}
) => {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return fetchJson<any[]>(`/messages${suffix}`, { method: "GET" }, token);
};

// ==== Integrations ====
// Vincular integración
export const linkIntegration = (
  token: string,
  body: {
    provider: Provider;
    externalId: string;     // ej: phone_number_id (Meta)
    phoneNumberId?: string; // opcional (si distinto)
    accessToken?: string;   // opcional si guardás por integración
    name?: string;          // alias para mostrar
  }
) =>
  fetchJson(
    "/integrations/link",
    { method: "POST", body: JSON.stringify(body) },
    token
  );

// Listar integraciones del usuario
export const listIntegrations = (token: string) =>
  fetchJson<any[]>("/integrations", { method: "GET" }, token);

// Eliminar integración
export const unlinkIntegration = (token: string, id: string) =>
  fetchJson(`/integrations/${id}`, { method: "DELETE" }, token);

export default fetchJson;
