"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Token de recuperación no válido');
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al restablecer contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (e: any) {
      setError(e.message || 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-400 mb-2">¡Contraseña actualizada!</h1>
            <p className="text-green-300 mb-4">Tu contraseña ha sido restablecida exitosamente.</p>
            <p className="text-neutral-400 text-sm">Redirigiendo al login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-white">Restablecer contraseña</h1>
          <p className="text-neutral-400 mt-2">Ingresa tu nueva contraseña</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-800 p-8 rounded-lg border border-neutral-700">
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-lg p-4">
              <p className="font-semibold">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
              placeholder="Ingresa tu nueva contraseña"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
              placeholder="Confirma tu nueva contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors duration-300"
          >
            {loading ? "Restableciendo..." : "Restablecer contraseña"}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-nexly-teal hover:text-nexly-green text-sm font-medium transition-colors duration-300">
              Volver al login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
