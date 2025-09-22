"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) throw new Error("Credenciales inválidas");
      const data = await res.json();
      localStorage.setItem("token", data.token); // 👈 obligatorio
      document.cookie = `token=${data.token}; Path=/; SameSite=Lax`;
      setAuth(data.token, data.user);
      
      // Redirigir según el contexto
      const plan = searchParams.get('plan');
      if (plan) {
        // Si vino con un plan, redirigir a pricing para completar el pago
        router.replace(`/pricing?plan=${plan}`);
      } else {
        // Si no vino con plan, redirigir al dashboard normal
        router.replace("/dashboard");
      }
    } catch (e: any) {
      setError(e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            className="w-full border rounded-md px-3 py-2 text-black"
            placeholder="Email o teléfono"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
          
          <div className="text-center space-y-3">
            <div>
              <Link href="/forgot-password" className="text-blue-600 hover:underline text-sm">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div>
              <span className="text-neutral-600 text-sm">
                ¿No estás registrado?{" "}
              </span>
              <Link href="/register" className="text-green-600 hover:underline text-sm font-medium">
                Regístrate aquí
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-svh grid place-items-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
