'use client';

import React, { useState } from 'react';
import { Phone, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface TelegramMTProtoConnectProps {
  onConnect?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function TelegramMTProtoConnect({ 
  onConnect, 
  onError, 
  disabled = false 
}: TelegramMTProtoConnectProps) {
  const { token } = useAuth();
  const [step, setStep] = useState<'phone' | 'code' | 'password' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      showToast.error('Por favor ingresa tu número de teléfono');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiFetch('/telegram/send-code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() })
      }, token || undefined);

      if (response.success) {
        setMaskedPhone(response.phoneNumber || phoneNumber);
        setStep('code');
        showToast.success('Código de verificación enviado');
      } else {
        throw new Error(response.message || 'Error enviando código');
      }
    } catch (error: any) {
      console.error('Error enviando código:', error);
      showToast.error(error.message || 'Error enviando código de verificación');
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      showToast.error('Por favor ingresa el código de verificación');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiFetch('/telegram/verify-code', {
        method: 'POST',
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.trim(),
          code: code.trim(),
          password: password ? password.trim() : undefined
        })
      }, token || undefined);

      if (response.success) {
        setStep('success');
        setCode(''); // Limpiar el input
        showToast.success('Telegram conectado exitosamente');
        onConnect?.();
      } else {
        if (response.requiresPassword) {
          setStep('password');
          setCode(''); // Limpiar el input
          showToast.error('Se requiere contraseña de autenticación de dos factores');
        } else {
          setCode(''); // Limpiar el input
          throw new Error(response.message || 'Error verificando código');
        }
      }
    } catch (error: any) {
      console.error('Error verificando código:', error);
      showToast.error(error.message || 'Error verificando código');
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      showToast.error('Por favor ingresa tu contraseña de 2FA');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiFetch('/telegram/verify-password', {
        method: 'POST',
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.trim(),
          password: password.trim()
        })
      }, token || undefined);

      if (response.success) {
        setStep('success');
        showToast.success('Telegram conectado exitosamente');
        onConnect?.();
      } else {
        throw new Error(response.message || 'Error verificando contraseña');
      }
    } catch (error: any) {
      console.error('Error verificando contraseña:', error);
      showToast.error(error.message || 'Error verificando contraseña');
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('phone');
    setPhoneNumber('');
    setCode('');
    setPassword('');
    setMaskedPhone('');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-accent-cream" />
        </div>
        <h2 className="text-2xl font-bold text-accent-cream mb-2">Conectar Telegram</h2>
        <p className="text-neutral-400">
          {step === 'phone' && 'Ingresa tu número de teléfono para comenzar'}
          {step === 'code' && `Ingresa el código enviado a ${maskedPhone}`}
          {step === 'password' && 'Ingresa tu contraseña de autenticación de dos factores'}
          {step === 'success' && '¡Telegram conectado exitosamente!'}
        </p>
      </div>

      {step === 'phone' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-300 mb-2">
              Número de teléfono
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full pl-10 pr-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled || isLoading}
                required
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Incluye el código de país (ej: +1 para Estados Unidos)
            </p>
          </div>

          <button
            type="submit"
            disabled={disabled || isLoading || !phoneNumber.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-accent-cream font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando código...
              </>
            ) : (
              'Enviar código de verificación'
            )}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-neutral-300 mb-2">
              Código de verificación
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled || isLoading}
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              Revisa tu aplicación de Telegram para el código
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-neutral-600 hover:bg-neutral-700 text-accent-cream font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              disabled={disabled || isLoading}
            >
              Cambiar número
            </button>
            <button
              type="submit"
              disabled={disabled || isLoading || !code.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-accent-cream font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar código'
              )}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleVerifyPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
              Contraseña de autenticación de dos factores
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña de 2FA"
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled || isLoading}
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              La contraseña que configuraste en Telegram para 2FA
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setStep('code')}
              className="flex-1 bg-neutral-600 hover:bg-neutral-700 text-accent-cream font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              disabled={disabled || isLoading}
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={disabled || isLoading || !password.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-accent-cream font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar contraseña'
              )}
            </button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-accent-cream" />
          </div>
          <h3 className="text-xl font-semibold text-accent-cream">¡Conectado!</h3>
          <p className="text-neutral-400">
            Tu cuenta de Telegram ha sido conectada exitosamente. Ahora puedes gestionar todos tus chats desde Nexly.
          </p>
          <button
            onClick={resetForm}
            className="bg-blue-500 hover:bg-blue-600 text-accent-cream font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Conectar otra cuenta
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">¿Qué significa esto?</p>
            <p className="text-blue-400">
              Conectamos tu cuenta personal de Telegram para que puedas gestionar todos tus chats, 
              grupos y mensajes desde una sola plataforma. Es completamente seguro y privado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
