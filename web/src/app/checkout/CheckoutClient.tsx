/* "Componente que redirige al usuario al checkout de Stripe después de crear la sesión"
Obtiene token y plan desde URL
Llama al endpoint para crear sesión de Stripe
Redirige automáticamente a la página de pago de Stripe */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import Loader, { PageLoader, ButtonLoader } from "@/components/Loader";

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const plan = searchParams.get('plan');
  const paymentMethod = searchParams.get('payment') || 'stripe';
  const token = searchParams.get('token');

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        // Si hay token, hacer auto-login
        if (token) {
          localStorage.setItem("token", token);
          document.cookie = `token=${token}; Path=/; SameSite=Lax`;
          
          // Obtener datos del usuario desde el token
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nexly-production.up.railway.app';
          const userResponse = await fetch(`${backendUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setAuth(token, userData.user);
          }
        }

        // Crear enlace de pago
        const endpoint = paymentMethod === 'stripe' ? '/stripe/create-payment-link' : '/subscriptions/create-payment-link';
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nexly-production.up.railway.app';
        const paymentResponse = await fetch(`${backendUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planType: plan }),
        });

        const paymentData = await paymentResponse.json();

        if (paymentData.success && paymentData.paymentUrl) {
          // Ir directo al checkout de Stripe
          window.location.href = paymentData.paymentUrl;
        } else {
          const errorMessage = paymentData.error || paymentData.message || 'Error desconocido';
          setError('Error al crear el enlace de pago: ' + errorMessage);
        }
      } catch (err: any) {
        console.error('Error en checkout:', err);
        setError('Error al procesar el pago: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (plan && token) {
      initializeCheckout();
    } else {
      setError('Faltan parámetros requeridos para el checkout');
      setLoading(false);
    }
  }, [plan, paymentMethod, token, setAuth]);

  if (loading) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
        <div className="rounded-2xl">
          <Loader size="xl" text="Redirigiendo a Stripe para completar tu suscripción" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />{/* Logo de Nexly */}
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error en el pago</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-nexly-teal hover:bg-nexly-green text-accent-cream font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
          >
            Volver a Planes
          </button>
        </div>
      </div>
    );
  }

  return null;
}
