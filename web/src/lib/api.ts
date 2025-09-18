// web/src/lib/api.ts

// Base de la API (sanitizada para NO dejar barra final)
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
  .replace(/\/+$/, "");

// Une base + path sin generar "//"
const join = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

type JSONValue = any;

function makeHeaders(token?: string, extra?: HeadersInit) {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as any).Authorization = `Bearer ${token}`;
  return { ...h, ...(extra || {}) };
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const data = await res.json(); msg = data?.error || data?.message || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// -------- core fetch --------
export async function apiFetch<T = JSONValue>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(join(path), {
    credentials: "omit",               // usa "include" si más adelante vas con cookies
    ...options,
    headers: makeHeaders(token, options.headers),
  });
  return toJson<T>(res);
}

// -------- helpers HTTP --------
export const get  = <T = JSONValue>(path: string, token?: string) =>
  apiFetch<T>(path, { method: "GET" }, token);

export const post = <T = JSONValue>(path: string, body?: unknown, token?: string) =>
  apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, token);

export const put  = <T = JSONValue>(path: string, body?: unknown, token?: string) =>
  apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }, token);

export const del  = <T = JSONValue>(path: string, token?: string) =>
  apiFetch<T>(path, { method: "DELETE" }, token);

// -------- endpoints de alto nivel --------
export const register = (body: { username: string; email: string; password: string }) =>
  post<{ message: string }>("/auth/register", body);

export const login = (body: { identifier?: string; email?: string; username?: string; password: string }) =>
  post<{ token: string; user: { id: string; username: string; email: string } }>("/auth/login", body);

export const getContacts = (token: string) =>
  get<any[]>("/contacts", token);

export const createContact = (
  token: string,
  body: { name: string; phone: string; email?: string; tags?: string[] }
) => post("/contacts", body, token);

export const getMessages = (
  token: string,
  params: { contactId?: string; provider?: string } = {}
) => {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  const s = q.toString();
  return get<any[]>(`/messages${s ? `?${s}` : ""}`, token);
};

export const sendMessageApi = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    to: string;
    message?: string;
    body?: string;
    contactId?: string;
  }
) => post("/messages/send", body, token);

export const linkIntegration = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    externalId: string;
    phoneNumberId?: string;
    accessToken?: string;
    name?: string;
  }
) => post("/integrations/link", body, token);

// util por si necesitás construir URLs absolutas
export const url = join;

// permite importar como default o nombrada
export default apiFetch;
