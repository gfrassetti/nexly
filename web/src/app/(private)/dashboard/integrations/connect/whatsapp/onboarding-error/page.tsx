"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function OnboardingErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const msg = searchParams.get('msg');

  useEffect(() => {
    // Redirigir después de 5 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard/integrations/connect/whatsapp');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Error en la conexión
        </h1>
        <p className="text-gray-600 mb-4">
          {msg || 'Hubo un problema al conectar tu WhatsApp Business.'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Serás redirigido automáticamente para intentar de nuevo en unos segundos.
        </p>
        <button
          onClick={() => router.push('/dashboard/integrations/connect/whatsapp')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
