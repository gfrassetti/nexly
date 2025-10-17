"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
// GoogleAuthButton eliminado - no debe interferir con el sistema de autenticación normal

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const plan = searchParams.get('plan');
      const paymentMethod = searchParams.get('payment') || 'stripe';
      
      
      const response = await registerApi({ username, email, password, plan: plan || undefined });
      
      
      setSuccess(true);
      
      // NO limpiar el plan del localStorage - necesitamos mantenerlo para el botón "Completar Pago"
      // localStorage.removeItem('selectedPlan');
      // localStorage.removeItem('selectedPaymentMethod');
      
      // Si hay un plan, hacer auto-login y redirigir directo al checkout
      if (plan && (plan === 'crecimiento' || plan === 'pro' || plan === 'business') && response.token && response.user) {
        // Guardar el plan en localStorage para mantener el contexto
        localStorage.setItem('selectedPlan', plan);
        localStorage.setItem('selectedPaymentMethod', paymentMethod);
        
        // Auto-login
        localStorage.setItem("token", response.token);
        document.cookie = `token=${response.token}; Path=/; SameSite=Lax`;
        setAuth(response.token, response.user);
        
        // Redirigir directo al checkout después del registro
        setTimeout(() => {
          // Ir directo al checkout de Stripe
          window.location.href = `/checkout?plan=${plan}&payment=${paymentMethod}&token=${response.token}`;
        }, 1000);
      } else {
        // Si no hay plan, ir a login para que inicie sesión
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-lg font-medium text-foreground">Crear cuenta</h1>
            <p className="text-muted-foreground text-sm mt-2">Únete a Nexly hoy</p>
          </div>
      
      <form onSubmit={onSubmit} className="space-y-6 bg-muted border border-border p-8 rounded-lg">
        
        {success && (
          <div className="p-3 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-lg">
            ✅ Cuenta creada exitosamente.
          </div>
        )}
        
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Google Auth Button - TEMPORALMENTE DESHABILITADO */}
        {/* <GoogleAuthButton className="mb-4" />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-800 text-neutral-400">o regístrate con email</span>
          </div>
        </div> */}

        <div>
          <input
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent transition-colors"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <input
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent transition-colors"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          disabled={loading || success}
          className="w-full bg-accent-green/20 hover:bg-accent-green/30 disabled:bg-muted text-accent-green border border-accent-green/30 hover:border-accent-green/50 font-medium py-3 rounded-lg disabled:opacity-50 transition-colors duration-300"
        >
          {loading ? "Creando cuenta..." : success ? "¡Cuenta creada!" : "Registrarse"}
        </button>
      
        <div className="text-center">
          <span className="text-muted-foreground text-sm">
            ¿Ya tienes cuenta?{" "}
          </span>
          <Link href="/login" className="text-accent-green hover:text-accent-green/80 text-sm font-medium transition-colors duration-300">
            Inicia sesión aquí
          </Link>
        </div>
      </form>
    </div>
  );
}
