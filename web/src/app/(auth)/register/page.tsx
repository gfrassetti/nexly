"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerApi } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

function RegisterForm() {
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
      <div className="min-h-svh grid place-items-center p-6 bg-neutral-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo_nexly.png" alt="Nexly" className="w-32 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
            <p className="text-neutral-400 mt-2">Únete a Nexly hoy</p>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-6 bg-neutral-800 p-8 rounded-lg border border-neutral-700">
          
          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✅ ¡Cuenta creada exitosamente! Redirigiendo al login...
            </div>
          )}
          
          {error && <p className="text-sm text-red-500">{error}</p>}

            <div>
              <input
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <input
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || success}
              className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Creando cuenta..." : success ? "¡Cuenta creada!" : "Registrarse"}
            </button>
          
            <div className="text-center">
              <span className="text-neutral-400 text-sm">
                ¿Ya tienes cuenta?{" "}
              </span>
              <Link href="/login" className="text-nexly-teal hover:text-nexly-green text-sm font-medium transition-colors">
                Inicia sesión aquí
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-svh grid place-items-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
