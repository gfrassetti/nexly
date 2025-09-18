export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const join = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

type Json = any;

function headers(token?: string, extra?: HeadersInit) {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as any).Authorization = `Bearer ${token}`;
  return { ...h, ...(extra || {}) };
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiFetch<T = Json>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(join(path), {
    ...options,
    headers: headers(token, options.headers || {}),
  });
  return toJson<T>(res);
}

export async function fetchJson<T = Json>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(join(path), {
    ...opts,
    headers: headers(token, opts.headers || {}),
  });
  return toJson<T>(res);
}

export const url = join;

/* Auth */
export const register = (body: { username: string; email: string; password: string }) =>
  fetchJson("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const login = (body: { identifier?: string; email?: string; username?: string; password: string }) =>
  fetchJson<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(body) });

/* Contacts */
export const getContacts = (token: string) =>
  fetchJson<any[]>("/contacts", { method: "GET" }, token);

export const createContact = (
  token: string,
  body: { name: string; phone: string; email?: string; tags?: string[] }
) => fetchJson("/contacts", { method: "POST", body: JSON.stringify(body) }, token);

/* Messages */
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

export const sendMessageApi = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    to: string;
    message?: string;
    body?: string;
    contactId?: string;
  }
) => fetchJson("/messages/send", { method: "POST", body: JSON.stringify(body) }, token);

/* Integrations */
export const linkIntegration = (
  token: string,
  body: {
    provider: "whatsapp" | "instagram" | "messenger";
    externalId: string;
    phoneNumberId?: string;
    accessToken?: string;
    name?: string;
  }
) => fetchJson("/integrations/link", { method: "POST", body: JSON.stringify(body) }, token);

export default apiFetch;
