import { useState, useEffect } from 'react';

interface MessagesByIntegrationData {
  date: string;
  whatsapp: number;
  telegram: number;
  instagram: number;
  messenger: number;
}

interface UseMessagesByIntegrationReturn {
  data: MessagesByIntegrationData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMessagesByIntegration(): UseMessagesByIntegrationReturn {
  const [data, setData] = useState<MessagesByIntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/analytics/messages-by-integration`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages by integration');
      }

      const result = await response.json();
      
      console.log('📊 Messages by Integration Response:', {
        success: result.success,
        dataLength: result.data?.length,
        data: result.data
      });
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        console.error('❌ Invalid response format:', result);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching messages by integration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

