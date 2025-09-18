// web/src/lib/api.ts

/**
 * Base de API (Vercel -> Railway). Debe venir de NEXT_PUBLIC_API_URL
 * y sin barra final. Ej: https://tu-app.up.railway.app
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

/** Une base + path sin generar '//' */
export const apiPath = (p: string) =>
  `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;

/** Lee el token del cookie 'token' o de localStorage (si existe) */
export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;

  // Cookie
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);

  // Fallback localStorage (por si lo guardaste allí)
  try {
    const ls = window.localStorage?.getItem("token");
    if (ls) return ls;
  } catch {}
  return undefined;
}

/** Convierte Response a error legible, tolerante a texto plano */
async function toReadableError(res: Response): Promise<never> {
  let msg = `HTTP ${res.status}`;
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      msg = (data && (data.message || data.error)) || msg;
    } else {
      const txt = await res.text();
      msg = txt || msg;
    }
  } catch {}
  throw new Error(msg);
}

/** Fetch centralizado: agrega Authorization automáticamente si hay token */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  explicitToken?: string
): Promise<T> {
  const token = explicitToken ?? getToken();

  const res = await fetch(apiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) return toReadableError(res);
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    // Si el backend devolvió texto, devolvemos como string
    const txt = await res.text();
    return txt as unknown as T;
  }
  return (await res.json()) as T;
}

/* ============================
 *  Auth
 * ============================ */

export const registerApi = (body: {
  username: string;
  email: string;
  password: string;
}) =>
  apiFetch<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const loginApi = (body: {
  identifier?: string;
  email?: string;
  username?: string;
  password: string;
}) =>
  apiFetch<{
    token: string;
    user: { id: string; username: string; email: string };
  }>("/auth/login", { method: "POST", body: JSON.stringify(body) });

/* ============================
 *  Integraciones
 * ============================ */

export type Provider = "whatsapp" | "instagram" | "messenger";

export const listIntegrations = () =>
  apiFetch<
    Array<{
      _id: string;
      provider: Provider;
      externalId: string;
      phoneNumberId?: string;
      name?: string;
      createdAt: string;
    }>
  >("/integrations", { method: "GET" });

export const linkIntegration = (body: {
  provider: Provider;
  externalId: string; // p.ej. phone_number_id en WhatsApp Cloud
  phoneNumberId?: string; // opcional, si querés guardarlo aparte
  accessToken?: string; // opcional, si vas a token por integración
  name?: string;
}) =>
  apiFetch("/integrations/link", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const unlinkIntegration = (id: string) =>
  apiFetch(`/integrations/${id}`, { method: "DELETE" });

/* ============================
 *  Contactos
 * ============================ */

export const getContacts = (params?: { provider?: Provider }) => {
  const q = new URLSearchParams();
  if (params?.provider) q.set("provider", params.provider);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<any[]>(`/contacts${suffix}`, { method: "GET" });
};

export const createContact = (body: {
  name?: string;
  phone: string;
  email?: string;
  tags?: string[];
  provider?: Provider;
}) =>
  apiFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateContact = (id: string, body: Partial<any>) =>
  apiFetch(`/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteContact = (id: string) =>
  apiFetch(`/contacts/${id}`, { method: "DELETE" });

/* ============================
 *  Mensajes
 * ============================ */

export const getMessages = (params: {
  contactId?: string;
  provider?: Provider;
  limit?: number;
  before?: string;
}) => {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.before) q.set("before", params.before);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<any[]>(`/messages${suffix}`, { method: "GET" });
};

export const sendMessageApi = (body: {
  provider: Provider;
  to?: string; // si no hay contactId
  body: string; // texto
  contactId?: string; // preferente si ya existe el contacto
}) =>
  apiFetch("/messages/send", {
    method: "POST",
    body: JSON.stringify(body),
  });

export default apiFetch;

