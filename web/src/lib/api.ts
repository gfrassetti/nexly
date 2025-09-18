// Base de la API sin barra final (si viene con / lo quita)
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
  .replace(/\/+$/, "");

// Une base + path sin generar "//"
export const apiPath = (p: string) => `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;

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
export const registerApi = (body: { username: string; email: string; password: string }) =>
  apiFetch<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const loginApi = (body: { identifier?: string; email?: string; username?: string; password: string }) =>
  apiFetch<{ token: string; user: { id: string; username: string; email: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(body) }
  );

export default apiFetch;
