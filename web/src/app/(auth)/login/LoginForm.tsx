"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";
import Logo from "@/components/Logo";

export default function LoginForm() {
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
      localStorage.setItem("token", data.token);
      document.cookie = `token=${data.token}; Path=/; SameSite=Lax`;
      setAuth(data.token, data.user);
      
      // Redirigir según el contexto
      const plan = searchParams.get('plan');
      if (plan) {
        // Ir a pricing para que el usuario complete el pago
        router.replace(`/pricing?plan=${plan}`);
      } else {
        router.replace("/dashboard");
      }
    } catch (e: any) {
      setError(e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-3xl font-bold text-white">Iniciar sesión</h1>
            <p className="text-neutral-400 mt-2">Bienvenido de vuelta</p>
          </div>
      
      <form onSubmit={onSubmit} className="space-y-6 bg-neutral-800 p-8 rounded-lg border border-neutral-700">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div>
          <input
            className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
            placeholder="Email o Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div>
          <input
            className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          disabled={loading}
          className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors duration-300"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      
        <div className="text-center space-y-3">
          <div>
            <Link href="/forgot-password" className="text-nexly-azul hover:text-nexly-light-blue text-sm transition-colors duration-300">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div>
            <span className="text-neutral-400 text-sm">
              ¿No estás registrado?{" "}
            </span>
            <Link href="/register" className="text-nexly-teal hover:text-nexly-green text-sm font-medium transition-colors duration-300">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
