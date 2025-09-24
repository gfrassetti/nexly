"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

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
          const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/me`, {
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
        const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
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
          setError('Error al crear el enlace de pago: ' + (paymentData.error || 'Error desconocido'));
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
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexly-teal mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Procesando pago...</h2>
          <p className="text-gray-600">Redirigiendo a Stripe para completar tu suscripción</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error en el pago</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-nexly-teal hover:bg-nexly-green text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
          >
            Volver a Planes
          </button>
        </div>
      </div>
    );
  }

  return null;
}
