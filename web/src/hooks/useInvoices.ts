"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface StripeInvoice {
  id: string;
  created: number;
  amount_paid: number;
  currency: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  status: string;
  subscription?: string;
}

interface UseInvoicesReturn {
  invoices: StripeInvoice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInvoices(): UseInvoicesReturn {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/stripe/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar facturas');
      }
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      setError('Error de conexión al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user?.id]);

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices,
  };
}
