'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle, AlertCircle, Trash2, Send, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TelegramStatusProps {
  integration: {
    _id: string;
    provider: string;
    name: string;
    status: string;
    meta?: {
      telegramUserId?: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
      telegramPhotoUrl?: string;
      connectedAt?: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  onDisconnect?: (integrationId: string) => void;
  onSendMessage?: (integrationId: string) => void;
  onConfigure?: (integrationId: string) => void;
}

export default function TelegramStatus({ 
  integration, 
  onDisconnect, 
  onSendMessage, 
  onConfigure 
}: TelegramStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    try {
      setIsDisconnecting(true);
      await onDisconnect(integration._id);
      
      toast({
        title: "Desconectado",
        description: "Telegram se ha desconectado exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo desconectar Telegram",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'linked':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Conectado
        </Badge>;
      case 'pending':
        return <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>;
      case 'error':
        return <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>{integration.name}</CardTitle>
          </div>
          {getStatusBadge(integration.status)}
        </div>
        <CardDescription>
          Integración de Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información del usuario de Telegram */}
        {integration.meta && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {integration.meta.telegramPhotoUrl ? (
                <img 
                  src={integration.meta.telegramPhotoUrl} 
                  alt="Avatar de Telegram"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {integration.meta.telegramFirstName} {integration.meta.telegramLastName}
                </p>
                {integration.meta.telegramUsername && (
                  <p className="text-sm text-muted-foreground">
                    @{integration.meta.telegramUsername}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  ID: {integration.meta.telegramUserId}
                </p>
              </div>
            </div>

            {/* Fecha de conexión */}
            {integration.meta.connectedAt && (
              <div className="text-sm text-muted-foreground">
                Conectado el: {formatDate(integration.meta.connectedAt)}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          {onSendMessage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(integration._id)}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensaje
            </Button>
          )}
          
          {onConfigure && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigure(integration._id)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          )}
          
          {onDisconnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-destructive hover:text-destructive"
            >
              {isDisconnecting ? (
                <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          )}
        </div>

        {/* Información adicional */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Creado: {formatDate(integration.createdAt)}</p>
          <p>Actualizado: {formatDate(integration.updatedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
