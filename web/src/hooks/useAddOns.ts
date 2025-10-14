import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface AddOn {
  id: string;
  conversationsAdded: number;
  purchaseDate: string;
  expirationDate: string;
  source?: string;
  remainingConversations: number;
}

interface UseAddOnsReturn {
  addOns: AddOn[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAddOns(): UseAddOnsReturn {
  const { token } = useAuth();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddOns = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/usage/add-ons', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener add-ons');
      }

      const result = await response.json();
      
      if (result.success) {
        setAddOns(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error fetching add-ons:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddOns();
  }, [token]);

  return {
    addOns,
    loading,
    error,
    refetch: fetchAddOns,
  };
}

// Hook para comprar add-ons
export function useBuyAddOn() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyAddOn = async (source: 'emergency_modal' | 'preventive_dashboard' = 'preventive_dashboard') => {
    if (!token) {
      setError('No autorizado');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/addons/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: 500,
          source,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear sesión de pago');
      }

      const result = await response.json();
      
      if (result.sessionId && result.url) {
        // Redirigir a Stripe Checkout
        window.location.href = result.url;
        return result;
      } else {
        throw new Error('Error al procesar el pago');
      }
    } catch (err: any) {
      console.error('Error buying add-on:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    buyAddOn,
    loading,
    error,
  };
}
