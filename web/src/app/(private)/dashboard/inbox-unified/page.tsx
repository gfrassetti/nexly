'use client';

import React from 'react';
import { MessageSquare, Users, BarChart3, Settings } from 'lucide-react';
import UnifiedInbox from '@/components/UnifiedInbox';

export default function UnifiedInboxPage() {
  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <MessageSquare className="w-8 h-8 mr-3 text-blue-400" />
                Bandeja Unificada
              </h1>
              <p className="text-neutral-400 mt-1">
                Gestiona todos tus mensajes de WhatsApp, Instagram, Messenger y Telegram en un solo lugar
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Estadísticas rápidas */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-neutral-400">Conversaciones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">0</div>
                  <div className="text-neutral-400">Sin leer</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">4</div>
                  <div className="text-neutral-400">Canales</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de canales */}
      <div className="bg-neutral-800 border-b border-neutral-700">
        <div className="px-6 py-3">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">WhatsApp</span>
            </div>
            <div className="flex items-center space-x-2 text-pink-400">
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              <span className="text-sm font-medium">Instagram</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">Messenger</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-300">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium">Telegram</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeja unificada */}
      <div className="h-[calc(100vh-200px)]">
        <UnifiedInbox />
      </div>

      {/* Footer con información */}
      <div className="bg-neutral-800 border-t border-neutral-700 px-6 py-4">
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Omnicanalidad completa</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Análisis unificado</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configuración centralizada</span>
            </div>
          </div>
          
          <div className="text-xs">
            Última actualización: {new Date().toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>
    </div>
  );
}
