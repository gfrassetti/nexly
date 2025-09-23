"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

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
      
      // Si hay un plan, hacer auto-login y redirigir directo al checkout
      if (plan && (plan === 'basic' || plan === 'premium') && response.token && response.user) {
        // Auto-login
        localStorage.setItem("token", response.token);
        document.cookie = `token=${response.token}; Path=/; SameSite=Lax`;
        setAuth(response.token, response.user);
        
        // Crear el enlace de pago inmediatamente después del registro
        setTimeout(async () => {
          try {
            const endpoint = paymentMethod === 'stripe' ? '/stripe/create-payment-link' : '/subscriptions/create-payment-link';
            const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${response.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ planType: plan }),
            });

            const paymentData = await paymentResponse.json();

            if (paymentData.success && paymentData.paymentUrl) {
              // Ir directo al checkout
              window.location.href = paymentData.paymentUrl;
            } else {
              // Si falla el checkout, ir al dashboard para que pueda intentar nuevamente
              console.error('Error creating payment link:', paymentData.error);
              router.push('/dashboard?payment_error=true');
            }
          } catch (error) {
            console.error('Error creating payment link:', error);
            // Si hay error, ir al dashboard para que pueda intentar nuevamente
            router.push('/dashboard?payment_error=true');
          }
        }, 1000);
      } else {
        // Si no hay plan, ir a pricing para que elija uno
        setTimeout(() => {
          router.push("/pricing");
        }, 1500);
      }
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
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
            <p className="text-neutral-400 mt-2">Únete a Nexly hoy</p>
          </div>
      
      <form onSubmit={onSubmit} className="space-y-6 bg-neutral-800 p-8 rounded-lg border border-neutral-700">
        
        {success && (
          <div className="p-3 bg-nexly-green/20 border border-nexly-green/50 text-nexly-green rounded">
            ✅ ¡Cuenta creada exitosamente! Redirigiendo...
          </div>
        )}
        
        {error && <p className="text-sm text-nexly-light-blue">{error}</p>}

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
          className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors duration-300"
        >
          {loading ? "Creando cuenta..." : success ? "¡Cuenta creada!" : "Registrarse"}
        </button>
      
        <div className="text-center">
          <span className="text-neutral-400 text-sm">
            ¿Ya tienes cuenta?{" "}
          </span>
          <Link href="/login" className="text-nexly-teal hover:text-nexly-green text-sm font-medium transition-colors duration-300">
            Inicia sesión aquí
          </Link>
        </div>
      </form>
    </div>
  );
}
