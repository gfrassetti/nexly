"use client";

import { useInvoices } from "@/hooks/useInvoices";

export default function InvoiceHistory() {
  const { invoices, loading, error } = useInvoices();

  // Función para formatear la fecha
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("es-ES", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Función para formatear el monto
  const formatAmount = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: currency.toUpperCase()
    });
  };

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'paid': 'bg-green-100 text-green-800',
      'open': 'bg-yellow-100 text-yellow-800',
      'void': 'bg-gray-100 text-gray-800',
      'uncollectible': 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  // Función para obtener el label del estado
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'paid': 'Pagada',
      'open': 'Pendiente',
      'void': 'Anulada',
      'uncollectible': 'Incobrable',
    };
    return statusLabels[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Historial de facturas</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // No mostrar errores al usuario
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Historial de facturas</h2>
      </div>
      <div className="p-6">
        {invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {formatDate(invoice.created)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ID: {invoice.id}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">
                    {formatAmount(invoice.amount_paid, invoice.currency)}
                  </span>
                  
                  <div className="flex space-x-2">
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Ver online
                      </a>
                    )}
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 text-sm underline"
                      >
                        Descargar PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No hay facturas anteriores</p>
          </div>
        )}
      </div>
    </div>
  );
}
