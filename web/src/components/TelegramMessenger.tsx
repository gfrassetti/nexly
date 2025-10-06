'use client';

import React, { useState, useEffect } from 'react';
// Removed UI component imports - using standard HTML elements
import { MessageSquare, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { showToast } from '../hooks/use-toast';

interface TelegramMessengerProps {
  integrationId: string;
  onMessageSent?: (messageId: string) => void;
}

interface SendMessageRequest {
  to: string;
  message: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export default function TelegramMessenger({ integrationId, onMessageSent }: TelegramMessengerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [parseMode, setParseMode] = useState<'HTML' | 'Markdown' | 'MarkdownV2'>('HTML');
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  // Using showToast directly

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !recipient.trim()) {
      showToast.error("Por favor completa todos los campos");
      return;
    }

    try {
      setIsSending(true);
      
      const response = await fetch('/api/integrations/telegram/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipient,
          message: message,
          parse_mode: parseMode
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLastMessageId(data.messageId);
        setMessage('');
        
        showToast.success(`Mensaje enviado exitosamente (ID: ${data.messageId})`);
        
        onMessageSent?.(data.messageId);
      } else {
        throw new Error(data.message || 'Error enviando mensaje');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje de Telegram:', error);
      showToast.error(error.message || "No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickMessage = (quickMessage: string) => {
    setMessage(quickMessage);
  };

  const quickMessages = [
    "¡Hola! ¿En qué puedo ayudarte?",
    "Gracias por contactarnos. Te responderemos pronto.",
    "Tu consulta ha sido recibida. Te contactaremos en breve.",
    "¿Tienes alguna pregunta específica?",
  ];

  return (
    <div className="w-full bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="p-6 border-b border-neutral-700">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
          <MessageSquare className="h-5 w-5" />
          Enviar Mensaje de Telegram
        </h3>
        <p className="text-sm text-neutral-400 mt-1">
          Envía mensajes a usuarios de Telegram desde tu panel de NEXLY
        </p>
      </div>
      <div className="p-6 space-y-6">
        <form onSubmit={handleSendMessage} className="space-y-4">
          {/* Destinatario */}
          <div className="space-y-2">
            <label htmlFor="recipient" className="block text-sm font-medium text-white mb-1">
              Destinatario (ID de Usuario de Telegram)
            </label>
            <input
              id="recipient"
              type="text"
              placeholder="Ej: 123456789"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isSending}
              required
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el ID numérico del usuario de Telegram al que quieres enviar el mensaje
            </p>
          </div>

          {/* Modo de parseo */}
          <div className="space-y-2">
            <label htmlFor="parseMode" className="block text-sm font-medium text-white mb-1">
              Formato del mensaje
            </label>
            <select
              id="parseMode"
              value={parseMode}
              onChange={(e) => setParseMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="HTML">HTML</option>
              <option value="Markdown">Markdown</option>
              <option value="MarkdownV2">Markdown V2</option>
            </select>
            <p className="text-xs text-muted-foreground">
              HTML: <code>&lt;b&gt;negrita&lt;/b&gt;</code>, <code>&lt;i&gt;cursiva&lt;/i&gt;</code><br/>
              Markdown: <code>**negrita**</code>, <code>*cursiva*</code>
            </p>
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium text-white mb-1">
              Mensaje
            </label>
            <textarea
              id="message"
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={4}
              required
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-vertical"
            />
          </div>

          {/* Mensajes rápidos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white mb-1">
              Mensajes rápidos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickMessages.map((quickMsg, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickMessage(quickMsg)}
                  disabled={isSending}
                  className="text-left justify-start h-auto p-2 bg-neutral-700 border border-neutral-600 rounded-md text-white hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-xs truncate">{quickMsg}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botón de envío */}
          <button 
            type="submit" 
            disabled={isSending || !message.trim() || !recipient.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensaje
              </>
            )}
          </button>
        </form>

        {/* Estado del último mensaje */}
        {lastMessageId && (
          <div className="p-3 bg-green-950/20 rounded-lg border border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-100">
                Último mensaje enviado
              </span>
            </div>
            <p className="text-xs text-green-300 mt-1">
              ID: {lastMessageId}
            </p>
          </div>
        )}

        {/* Información adicional */}
        <div className="p-4 bg-blue-950/20 rounded-lg border border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-100">
                Información importante
              </p>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• El destinatario debe haber iniciado una conversación con tu bot</li>
                <li>• Usa el ID numérico del usuario de Telegram (no el username)</li>
                <li>• Los mensajes se envían a través de tu bot de Telegram</li>
                <li>• Puedes usar HTML o Markdown para formatear el texto</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
