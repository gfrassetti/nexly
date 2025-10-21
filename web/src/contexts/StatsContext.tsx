'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

interface DashboardStats {
  activeIntegrations: number;
  unreadMessages: number;
}

interface StatsContextType {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

interface StatsResponse {
  success: boolean;
  data?: DashboardStats;
  message?: string;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeIntegrations: 0,
    unreadMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtener estadísticas reales del backend
      const response = await apiFetch('/analytics/dashboard', {}, token) as StatsResponse;
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        console.warn('Error en respuesta de stats:', response.message);
        // No establecer error, usar datos por defecto
        setStats({
          activeIntegrations: 0,
          unreadMessages: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      // No establecer error, usar datos por defecto
      setStats({
        activeIntegrations: 0,
        unreadMessages: 0,
      });
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
