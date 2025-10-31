"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface WhatsAppEmbeddedSignupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

export default function WhatsAppEmbeddedSignup({
  isOpen,
  onClose,
  onSuccess,
  onError
}: WhatsAppEmbeddedSignupProps) {
  const [step, setStep] = useState<'loading' | 'connecting' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeSignup();
    }
  }, [isOpen]);

  const initializeSignup = async () => {
    try {
      setStep('loading');
      
      /**
       * SECURITY: Este fetch llama a Next.js API Route que actúa como proxy.
       * ⚠️ IMPORTANTE: NUNCA hacemos llamadas directas a la API de Twilio desde aquí.
       * El AuthToken de Twilio permanece siempre en el backend.
       */
      const response = await fetch('/api/whatsapp/create-signup-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/api/whatsapp/onboarding-callback`,
          failureUrl: `${window.location.origin}/dashboard/integrations/connect/whatsapp/onboarding-error`
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear sesión de registro');
      }

      const data = await response.json();
      const signupUrl = data.signupUrl;

      // Abrir pop-up con la URL de Twilio
      const popup = window.open(signupUrl, 'WhatsAppSignup', 'width=800,height=700,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        throw new Error('No se pudo abrir la ventana de registro. Verifica que los pop-ups estén permitidos.');
      }

      popupRef.current = popup;

      // Monitorear el cierre del pop-up
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setStep('error');
          setErrorMessage('Proceso de registro cancelado o cerrado.');
          onError('Proceso cancelado');
          onClose();
        }
      }, 500);

      setStep('connecting');
      onClose(); // Cerramos la modal de Nexly, la conexión sigue en el pop-up

    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message);
      onError(error.message);
      onClose();
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold">Preparando conexión...</h3>
            <p className="text-sm text-gray-600 text-center">
              Estamos configurando el proceso de registro con WhatsApp Business
            </p>
          </div>
        );

      case 'connecting':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold">Proceso iniciado</h3>
            <p className="text-sm text-gray-600 text-center">
              Se ha abierto una ventana emergente. Completa el proceso de registro de WhatsApp Business allí.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <h4 className="font-medium text-blue-900 mb-2">Pasos a seguir:</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start space-x-2">
                  <span className="font-medium">1.</span>
                  <span>Inicia sesión con tu cuenta de Facebook Business</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">2.</span>
                  <span>Confirma tu Facebook Business Manager ID</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">3.</span>
                  <span>Ingresa tu número de teléfono</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">4.</span>
                  <span>Verifica con el código SMS</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              No cierres esta ventana hasta completar el proceso
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h3 className="text-lg font-semibold text-green-900">¡WhatsApp conectado exitosamente!</h3>
            <p className="text-sm text-gray-600 text-center">
              Tu número de WhatsApp Business está listo para usar en Nexly.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h3 className="text-lg font-semibold text-red-900">Error en la conexión</h3>
            <p className="text-sm text-gray-600 text-center">
              {errorMessage || 'Hubo un problema al conectar tu WhatsApp Business.'}
            </p>
            <Button onClick={initializeSignup} variant="outline">
              Intentar de nuevo
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Conectar WhatsApp Business</span>
          </DialogTitle>
          <DialogDescription>
            Registra tu número de WhatsApp Business con Meta para empezar a usarlo en Nexly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>

        {step !== 'loading' && step !== 'success' && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
