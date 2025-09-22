"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerApi } from "@/lib/api";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await registerApi({ username, email, password });
      setSuccess(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        const plan = searchParams.get('plan');
        if (plan) {
          router.push(`/login?plan=${plan}`);
        } else {
          router.push("/login");
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/logo_nexly.png" alt="Nexly" className="w-32 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
        <p className="text-neutral-400 mt-2">Únete a Nexly hoy</p>
      </div>
      
      <form onSubmit={onSubmit} className="space-y-6 bg-neutral-800 p-8 rounded-lg border border-neutral-700">
        
        {success && (
          <div className="p-3 bg-green-900/50 border border-green-700 text-green-300 rounded">
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
  );
}
