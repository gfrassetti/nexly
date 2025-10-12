import { useState, useEffect } from 'react';

interface MessageTimelineData {
  date: string;
  sent: number;
  received: number;
}

interface UseMessagesTimelineReturn {
  data: MessageTimelineData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMessagesTimeline(): UseMessagesTimelineReturn {
  const [data, setData] = useState<MessageTimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setError('No authentication token found');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/analytics/messages-timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages timeline');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        console.log('✅ Using real data from API');
      } else {
        console.log('📊 No data available from API');
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching messages timeline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchTimeline,
  };
}

