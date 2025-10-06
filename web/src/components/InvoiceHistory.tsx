"use client";

import { useInvoices, formatInvoiceAmount, formatInvoiceDate, getInvoiceStatusLabel, getInvoiceStatusColor } from "@/hooks/useInvoices";
import { StripeInvoice } from "@/hooks/useInvoices";

interface InvoiceHistoryProps {
  className?: string;
}

export default function InvoiceHistory({ className = "" }: InvoiceHistoryProps) {
  const { invoices, loading, error } = useInvoices();

  if (loading) {
    return (
      <div className={`bg-muted border border-border rounded-lg ${className}`}>
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Historial de facturas</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border last:border-b-0">
                <div className="space-y-2">
                  <div className="h-4 bg-background rounded w-32"></div>
                  <div className="h-3 bg-background rounded w-24"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-background rounded w-20"></div>
                  <div className="h-3 bg-background rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-muted border border-border rounded-lg ${className}`}>
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Historial de facturas</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm">Error al cargar las facturas</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className={`bg-muted border border-border rounded-lg ${className}`}>
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Historial de facturas</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm">No hay facturas disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">Las facturas aparecerán aquí una vez que comiences a usar el servicio</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-muted border border-border rounded-lg ${className}`}>
      <div className="p-6 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Historial de facturas</h2>
        <p className="text-xs text-muted-foreground mt-1">{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-border">
        {invoices.map((invoice) => (
          <InvoiceItem key={invoice.id} invoice={invoice} />
        ))}
      </div>
    </div>
  );
}

interface InvoiceItemProps {
  invoice: StripeInvoice;
}

function InvoiceItem({ invoice }: InvoiceItemProps) {
  const handleDownload = () => {
    if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank');
    }
  };

  const handleView = () => {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank');
    }
  };

  return (
    <div className="p-6 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {invoice.number || `Factura ${invoice.id.slice(-8)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatInvoiceDate(invoice.created)}
              </p>
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}>
              {getInvoiceStatusLabel(invoice.status)}
            </span>
          </div>
          
          {invoice.description && (
            <p className="text-xs text-muted-foreground mt-1">{invoice.description}</p>
          )}
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
            <span>Período: {formatInvoiceDate(invoice.period_start)} - {formatInvoiceDate(invoice.period_end)}</span>
            {invoice.customer_email && (
              <span>• {invoice.customer_email}</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {formatInvoiceAmount(invoice.total, invoice.currency)}
            </p>
            {invoice.amount_due > 0 && invoice.amount_paid < invoice.total && (
              <p className="text-xs text-accent-cream">
                Pendiente: {formatInvoiceAmount(invoice.amount_due, invoice.currency)}
              </p>
            )}
          </div>

          <div className="flex space-x-2">
            {invoice.hosted_invoice_url && (
              <button
                onClick={handleView}
                className="inline-flex items-center px-2 py-1 border border-border text-xs font-medium rounded-md text-foreground bg-muted hover:bg-muted/80 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver
              </button>
            )}
            
            {invoice.invoice_pdf && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-2 py-1 border border-border text-xs font-medium rounded-md text-foreground bg-muted hover:bg-muted/80 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}