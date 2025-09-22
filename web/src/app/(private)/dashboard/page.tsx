"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getContacts, getMessages } from "@/lib/api";
import useSWR from "swr";

interface DashboardStats {
  totalContacts: number;
  totalMessages: number;
  conversationsToday: number;
  averageResponseTime: number;
  activeIntegrations: number;
  messagesByPlatform: Record<string, number>;
  recentMessages: any[];
  unreadConversations: number;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalMessages: 0,
    conversationsToday: 0,
    averageResponseTime: 0,
    activeIntegrations: 0,
    messagesByPlatform: {},
    recentMessages: [],
    unreadConversations: 0,
  });

  // Fetch datos en paralelo
  const { data: contacts } = useSWR(
    token ? ["/contacts", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  const { data: messages } = useSWR(
    token ? ["/messages", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  const { data: integrations } = useSWR(
    token ? ["/integrations", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  // Calcular estadísticas
  useEffect(() => {
    if (!contacts || !messages || !integrations) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mensajes de hoy
    const messagesToday = messages.filter((msg: any) => {
      const msgDate = new Date(msg.createdAt || msg.timestamp);
      return msgDate >= today;
    });

    // Conversaciones únicas de hoy
    const conversationsToday = new Set(
      messagesToday.map((msg: any) => msg.conversationId || msg.contactId)
    ).size;

    // Mensajes por plataforma
    const messagesByPlatform = messages.reduce((acc: any, msg: any) => {
      const platform = msg.provider || msg.integrationId || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});

    // Tiempo promedio de respuesta (simulado)
    const averageResponseTime = Math.floor(Math.random() * 30) + 5; // 5-35 minutos

    // Mensajes recientes (últimos 5)
    const recentMessages = messages
      .sort((a: any, b: any) => 
        new Date(b.createdAt || b.timestamp).getTime() - 
        new Date(a.createdAt || a.timestamp).getTime()
      )
      .slice(0, 5);

    // Conversaciones no leídas (simulado)
    const unreadConversations = Math.floor(Math.random() * 10);

    setStats({
      totalContacts: contacts.length,
      totalMessages: messages.length,
      conversationsToday: conversationsToday,
      averageResponseTime,
      activeIntegrations: integrations.length,
      messagesByPlatform,
      recentMessages,
      unreadConversations,
    });
  }, [contacts, messages, integrations]);

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp': return 'bg-green-500';
      case 'instagram': return 'bg-pink-500';
      case 'messenger': return 'bg-blue-500';
      default: return 'bg-neutral-500';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp': return '📱';
      case 'instagram': return '📸';
      case 'messenger': return '💬';
      default: return '📞';
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header */}
      <div className="border-b border-neutral-700 bg-neutral-800 p-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-neutral-400 mt-1">
            Resumen de tu actividad y métricas principales
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-6 space-y-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de contactos */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Total Contactos</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalContacts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-400 text-sm">+12%</span>
              <span className="text-neutral-500 text-sm ml-2">vs mes pasado</span>
            </div>
          </div>

          {/* Conversaciones hoy */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Conversaciones Hoy</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.conversationsToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-400 text-sm">+8%</span>
              <span className="text-neutral-500 text-sm ml-2">vs ayer</span>
            </div>
          </div>

          {/* Tiempo promedio de respuesta */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Tiempo Respuesta</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.averageResponseTime}m</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-red-400 text-sm">-15%</span>
              <span className="text-neutral-500 text-sm ml-2">vs semana pasada</span>
            </div>
          </div>

          {/* Integraciones activas */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Integraciones</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.activeIntegrations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-400 text-sm">+2</span>
              <span className="text-neutral-500 text-sm ml-2">este mes</span>
            </div>
          </div>
        </div>

        {/* Segunda fila de métricas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mensajes por plataforma */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Mensajes por Plataforma</h3>
            <div className="space-y-3">
              {Object.entries(stats.messagesByPlatform).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getPlatformIcon(platform)}</span>
                    <span className="text-white capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-neutral-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getPlatformColor(platform)}`}
                        style={{ 
                          width: `${Math.min(100, (count as number / Math.max(...Object.values(stats.messagesByPlatform) as number[])) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
            <div className="space-y-3">
              {stats.recentMessages.length > 0 ? (
                stats.recentMessages.map((msg: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPlatformColor(msg.provider || msg.integrationId)}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {msg.content || msg.body || 'Mensaje sin contenido'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {msg.provider || msg.integrationId} • {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No hay actividad reciente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Nuevo Contacto</p>
                <p className="text-sm opacity-90">Agregar contacto manualmente</p>
              </div>
            </button>
            
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Conectar App</p>
                <p className="text-sm opacity-90">Integrar nueva plataforma</p>
              </div>
            </button>
            
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Ver Reportes</p>
                <p className="text-sm opacity-90">Analizar métricas detalladas</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
