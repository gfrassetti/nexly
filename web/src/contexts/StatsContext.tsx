'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

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

interface StatsContextType {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtener estadísticas reales del backend
      const response = await apiFetch('/analytics/dashboard-stats', {}, token);
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.message || 'Error cargando estadísticas');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async () => {
    await fetchStats();
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  return (
    <StatsContext.Provider value={{ stats, isLoading, error, refreshStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}
