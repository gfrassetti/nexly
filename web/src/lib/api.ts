// Base de la API sin barra final (si viene con / lo quita)
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

// Une base + path sin generar "//"
export const apiPath = (p: string) =>
  `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;

// Wrapper simple con manejo de errores consistente
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(apiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Mejor mensaje de error
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  // 204 => sin body
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Endpoints de alto nivel
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
function authHeaders(token?: string) {
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
  return (await res.json()) as T;
}
export async function fetchJson<T>(
  path: string,
  opts: RequestInit = {},
  token?: string
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts.headers || {}) },
  });
  return handle<T>(res);
}

export const createContact = (
  token: string,
  body: { name: string; phone: string; email?: string; tags?: string[] }
) =>
  fetchJson("/contacts", { method: "POST", body: JSON.stringify(body) }, token);

export const sendMessageApi = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    to: string;
    message?: string;
    body?: string;
    contactId?: string;
  }
) =>
  fetchJson(
    "/messages/send",
    { method: "POST", body: JSON.stringify(body) },
    token
  );

export const getContacts = (token: string) =>
  fetchJson<any[]>("/contacts", { method: "GET" }, token);

export const getMessages = (
  token: string,
  params: { contactId?: string; provider?: string } = {}
) => {
  const q = new URLSearchParams();
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.provider) q.set("provider", params.provider);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return fetchJson<any[]>(`/messages${suffix}`, { method: "GET" }, token);
};

export const linkIntegration = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    externalId: string;
    phoneNumberId?: string;
    accessToken?: string;
    name?: string;
  }
) =>
  fetchJson(
    "/integrations/link",
    { method: "POST", body: JSON.stringify(body) },
    token
  );

export default apiFetch;
