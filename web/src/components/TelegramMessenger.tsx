'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !recipient.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
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
        
        toast({
          title: "Mensaje enviado",
          description: `Mensaje enviado exitosamente (ID: ${data.messageId})`,
        });
        
        onMessageSent?.(data.messageId);
      } else {
        throw new Error(data.message || 'Error enviando mensaje');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje de Telegram:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Enviar Mensaje de Telegram
        </CardTitle>
        <CardDescription>
          Envía mensajes a usuarios de Telegram desde tu panel de NEXLY
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSendMessage} className="space-y-4">
          {/* Destinatario */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatario (ID de Usuario de Telegram)</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="Ej: 123456789"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isSending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el ID numérico del usuario de Telegram al que quieres enviar el mensaje
            </p>
          </div>

          {/* Modo de parseo */}
          <div className="space-y-2">
            <Label htmlFor="parseMode">Formato del mensaje</Label>
            <Select value={parseMode} onValueChange={(value: any) => setParseMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTML">HTML</SelectItem>
                <SelectItem value="Markdown">Markdown</SelectItem>
                <SelectItem value="MarkdownV2">Markdown V2</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              HTML: <code>&lt;b&gt;negrita&lt;/b&gt;</code>, <code>&lt;i&gt;cursiva&lt;/i&gt;</code><br/>
              Markdown: <code>**negrita**</code>, <code>*cursiva*</code>
            </p>
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={4}
              required
            />
          </div>

          {/* Mensajes rápidos */}
          <div className="space-y-2">
            <Label>Mensajes rápidos</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickMessages.map((quickMsg, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickMessage(quickMsg)}
                  disabled={isSending}
                  className="text-left justify-start h-auto p-2"
                >
                  <span className="text-xs truncate">{quickMsg}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Botón de envío */}
          <Button 
            type="submit" 
            disabled={isSending || !message.trim() || !recipient.trim()}
            className="w-full"
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
          </Button>
        </form>

        {/* Estado del último mensaje */}
        {lastMessageId && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Último mensaje enviado
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              ID: {lastMessageId}
            </p>
          </div>
        )}

        {/* Información adicional */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Información importante
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• El destinatario debe haber iniciado una conversación con tu bot</li>
                <li>• Usa el ID numérico del usuario de Telegram (no el username)</li>
                <li>• Los mensajes se envían a través de tu bot de Telegram</li>
                <li>• Puedes usar HTML o Markdown para formatear el texto</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
