"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerApi, loginApi } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1) Registrar (tu back NO devuelve token acá)
      await registerApi({ username, email, password });

      // 2) Loguear para obtener token (podés usar email o username)
      const { token, user } = await loginApi({ email, password });

      // 3) Guardar sesión y redirigir
      document.cookie = `token=${token}; Path=/; SameSite=Lax`;
      setAuth(token, user);
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message || "Error de registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}

        <input
          className="w-full border rounded-md px-3 py-2 text-black"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="w-full border rounded-md px-3 py-2 text-black"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded-md px-3 py-2 text-black"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
