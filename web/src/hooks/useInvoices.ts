"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export interface StripeInvoice {
  id: string;
  object: "invoice";
  account_country: string;
  account_name: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  billing_reason: string;
  collection_method: "charge_automatically" | "send_invoice";
  created: number;
  currency: string;
  customer: string;
  customer_email: string;
  customer_name: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  number: string | null;
  paid: boolean;
  payment_intent: string | null;
  period_end: number;
  period_start: number;
  receipt_number: string | null;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  subtotal: number;
  tax: number | null;
  total: number;
  lines: {
    object: "list";
    data: Array<{
      id: string;
      object: "line_item";
      amount: number;
      currency: string;
      description: string | null;
      period: {
        end: number;
        start: number;
      };
      price: {
        id: string;
        object: "price";
        unit_amount: number;
        currency: string;
        product: string;
      };
      quantity: number;
      type: "invoiceitem" | "subscription";
    }>;
    has_more: boolean;
    total_count: number;
  };
}

export interface InvoicesResponse {
  invoices: StripeInvoice[];
}

export function useInvoices() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/stripe/invoices`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data: InvoicesResponse = await response.json();
        setInvoices(data.invoices || []);
      } catch (err: any) {
        console.error('Error fetching invoices:', err);
        setError(err.message || 'Error al cargar las facturas');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [token]);

  return { invoices, loading, error, refetch: () => {
    if (token) {
      setLoading(true);
      setError(null);
      // Re-trigger the effect
      setInvoices([]);
    }
  }};
}

// Utilidades para formatear facturas
export const formatInvoiceAmount = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export const formatInvoiceDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getInvoiceStatusLabel = (status: string) => {
  const statusLabels: Record<string, string> = {
    'draft': 'Borrador',
    'open': 'Pendiente',
    'paid': 'Pagada',
    'void': 'Anulada',
    'uncollectible': 'No cobrable',
  };
  return statusLabels[status] || status;
};

export const getInvoiceStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'open': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800',
    'void': 'bg-red-100 text-red-800',
    'uncollectible': 'bg-red-100 text-red-800',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};