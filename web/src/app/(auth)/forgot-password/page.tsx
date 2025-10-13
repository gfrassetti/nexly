"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        if (data.resetUrl) {
          // Enlace de recuperación disponible
        }
      } else {
        setError(data.message || "Error al enviar solicitud");
      }
    } catch (err: any) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Recuperar contraseña</h1>
            <p className="text-gray-600 text-sm">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                {message}
              </div>
            )}

            <input
              className="w-full border rounded-md px-3 py-2 text-black"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-accent-cream rounded-md py-2 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          <div className="text-center space-y-2">
            <div>
              <Link href="/login" className="text-blue-600 hover:underline text-sm">
                ← Volver al login
              </Link>
            </div>
            <div>
              <span className="text-neutral-600 text-sm">
                ¿Recordaste tu contraseña?{" "}
              </span>
              <Link href="/login" className="text-green-600 hover:underline text-sm font-medium">
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-svh grid place-items-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
