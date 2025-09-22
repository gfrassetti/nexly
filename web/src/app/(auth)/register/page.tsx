"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerApi } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    
    try {
      // Solo registrar
      await registerApi({ username, email, password });
      
      // Mostrar éxito y redirigir según el contexto
      setSuccess(true);
      const plan = searchParams.get('plan');
      
      setTimeout(() => {
        if (plan) {
          // Si vino con un plan, redirigir a login con el plan para que después vaya a pricing
          router.replace(`/login?plan=${plan}`);
        } else {
          // Si no vino con plan, redirigir al login normal
          router.replace("/login");
        }
      }, 2000);
      
    } catch (e: any) {
      setError(e.message || "Error de registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold">Crear cuenta</h1>
          
          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✅ ¡Cuenta creada exitosamente! Redirigiendo al login...
            </div>
          )}
          
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
            disabled={loading || success}
            className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : success ? "¡Cuenta creada!" : "Registrarse"}
          </button>
          
          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-blue-600 hover:underline"
            >
              Iniciar sesión
            </button>
          </p>
        </form>
      </div>
    </AuthGuard>
  );
}
