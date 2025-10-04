"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";
import Logo from "@/components/Logo";
// GoogleAuthButton eliminado - no debe interferir con el sistema de autenticación normal

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  // Construir la URL de registro y limpiar localStorage del plan
  const getRegisterUrl = () => {
    // Limpiar el plan del localStorage cuando el usuario va al registro desde login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedPlan');
      localStorage.removeItem('selectedPaymentMethod');
    }
    return '/register';
  };

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
      
      // Siempre ir al dashboard después del login
      // El dashboard mostrará el botón de "Completar Pago" si es necesario
      router.replace("/dashboard");
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
            <h1 className="text-lg font-medium text-foreground">Iniciar sesión</h1>
            <p className="text-muted-foreground text-sm mt-2">Bienvenido de vuelta</p>
          </div>
      
      <form onSubmit={onSubmit} className="space-y-6 bg-muted border border-border p-8 rounded-lg">
        {error && <p className="text-sm text-destructive">{error}</p>}
        
        {/* Google Auth Button - TEMPORALMENTE DESHABILITADO */}
        {/* <GoogleAuthButton className="mb-4" />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-800 text-neutral-400">o continúa con email</span>
          </div>
        </div> */}
        
        <div>
          <input
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent transition-colors"
            placeholder="Email o Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div>
          <input
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent transition-colors"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          disabled={loading}
          className="w-full bg-accent-green/20 hover:bg-accent-green/30 disabled:bg-muted text-accent-green border border-accent-green/30 hover:border-accent-green/50 font-medium py-3 rounded-lg disabled:opacity-50 transition-colors duration-300"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      
        <div className="text-center space-y-3">
          <div>
            <Link href="/forgot-password" className="text-accent-blue hover:text-accent-blue/80 text-sm transition-colors duration-300">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">
              ¿No estás registrado?{" "}
            </span>
            <Link href={getRegisterUrl()} className="text-accent-green hover:text-accent-green/80 text-sm font-medium transition-colors duration-300">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
