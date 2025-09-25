"use client";

import { useInvoices, formatInvoiceAmount } from "@/hooks/useInvoices";
import { useMemo } from "react";

export default function BillingStats() {
  const { invoices, loading } = useInvoices();

  const stats = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalInvoices: 0,
        totalPaid: 0,
        totalPending: 0,
        averageAmount: 0,
        lastInvoiceDate: null,
      };
    }

    const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
    const pendingInvoices = invoices.filter(invoice => invoice.status === 'open');
    
    const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalPending = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount_due, 0);
    const averageAmount = invoices.length > 0 ? invoices.reduce((sum, invoice) => sum + invoice.total, 0) / invoices.length : 0;
    
    const lastInvoice = invoices.sort((a, b) => b.created - a.created)[0];
    const lastInvoiceDate = lastInvoice ? new Date(lastInvoice.created * 1000) : null;

    return {
      totalInvoices: invoices.length,
      totalPaid,
      totalPending,
      averageAmount,
      lastInvoiceDate,
    };
  }, [invoices]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Estadísticas de facturación</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stats.totalInvoices === 0) {
    return null; // No mostrar estadísticas si no hay facturas
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Estadísticas de facturación</h2>
        <p className="text-sm text-gray-500 mt-1">Resumen de tu actividad de facturación</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</div>
            <div className="text-sm text-gray-500">Total facturas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatInvoiceAmount(stats.totalPaid)}
            </div>
            <div className="text-sm text-gray-500">Total pagado</div>
          </div>
          
          {stats.totalPending > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatInvoiceAmount(stats.totalPending)}
              </div>
              <div className="text-sm text-gray-500">Pendiente</div>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatInvoiceAmount(stats.averageAmount)}
            </div>
            <div className="text-sm text-gray-500">Promedio</div>
          </div>
        </div>
        
        {stats.lastInvoiceDate && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Última factura: {stats.lastInvoiceDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
