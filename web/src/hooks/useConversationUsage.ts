import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface ConversationUsage {
  monthly: {
    used: number;
    limit: number;
    baseLimit: number;
    addOnLimit: number;
    percentage: number;
    remaining: number;
  };
  daily: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  status: 'healthy' | 'warning' | 'critical';
  canSend: boolean;
}

interface UseConversationUsageReturn {
  usage: ConversationUsage | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConversationUsage(): UseConversationUsageReturn {
  const { token } = useAuth();
  const [usage, setUsage] = useState<ConversationUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/usage/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener métricas de uso');
      }

      const result = await response.json();
      
      if (result.success) {
        setUsage(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error fetching conversation usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [token]);

  return {
    usage,
    loading,
    error,
    refetch: fetchUsage,
  };
}
