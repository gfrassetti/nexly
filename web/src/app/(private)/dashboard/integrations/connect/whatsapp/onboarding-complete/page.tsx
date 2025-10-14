"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');

  useEffect(() => {
    // Redirigir después de 3 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard/integrations');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡WhatsApp conectado exitosamente!
        </h1>
        {phone && (
          <p className="text-gray-600 mb-4">
            Tu número <strong>{phone}</strong> está listo para usar en Nexly.
          </p>
        )}
        <p className="text-sm text-gray-500 mb-6">
          Serás redirigido automáticamente al dashboard de integraciones en unos segundos.
        </p>
        <button
          onClick={() => router.push('/dashboard/integrations')}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}
