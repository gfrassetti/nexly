"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token de recuperación no válido");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Contraseña actualizada exitosamente. Ya puedes iniciar sesión.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.message || "Error al actualizar contraseña");
      }
    } catch (err: any) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthGuard requireAuth={false}>
        <div className="min-h-svh grid place-items-center p-6">
          <div className="w-full max-w-sm text-center">
            <h1 className="text-2xl font-semibold mb-4">Token inválido</h1>
            <p className="text-gray-600 mb-4">
              El enlace de recuperación no es válido o ha expirado.
            </p>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Nueva contraseña</h1>
            <p className="text-gray-600 text-sm">
              Ingresa tu nueva contraseña
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
              placeholder="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <input
              className="w-full border rounded-md px-3 py-2 text-black"
              placeholder="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-blue-600 hover:underline text-sm">
              ← Volver al login
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-svh grid place-items-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
