"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useConversationUsage } from '@/hooks/useConversationUsage';
import { useBuyAddOn } from '@/hooks/useAddOns';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsageMeter() {
  const { usage, loading, error, refetch } = useConversationUsage();
  const { buyAddOn, loading: buyLoading } = useBuyAddOn();

  const handleBuyAddOn = async () => {
    const result = await buyAddOn('preventive_dashboard');
    if (result) {
      // Refetch usage after successful purchase
      setTimeout(refetch, 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-accent-dark border border-neutral-700 rounded-lg p-6 shadow-lg">
        <Skeleton className="h-6 w-64 mx-auto mb-4" />
        <Skeleton className="h-8 w-32 mx-auto mb-4" />
        <Skeleton className="h-3 w-full mb-4" />
        <Skeleton className="h-4 w-48 mx-auto mb-6" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-accent-dark border border-red-500/50 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-red-400 mb-2 text-center">Error al cargar métricas</h3>
        <p className="text-sm text-neutral-400 text-center">{error}</p>
        <Button
          onClick={refetch}
          className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const progressValue = usage.monthly.percentage;
  const currentUsage = usage.monthly.used;
  const monthlyLimit = usage.monthly.limit;

  const getProgressBarColor = () => {
    if (usage.status === 'critical') return 'bg-red-500';
    if (usage.status === 'warning') return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (usage.status === 'critical') return 'text-red-400';
    if (usage.status === 'warning') return 'text-orange-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (usage.status === 'critical') {
      return (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    if (usage.status === 'warning') {
      return (
        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  return (
    <div className="bg-accent-dark border border-neutral-700 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-4">
        {getStatusIcon()}
        <h3 className="text-xl font-bold text-accent-cream">Uso de Conversaciones Iniciadas</h3>
      </div>
      
      <div className="mb-4 text-center">
        <p className={cn("text-3xl font-bold", getTextColor())}>
          {currentUsage} / {monthlyLimit}
        </p>
        <p className="text-sm text-neutral-400">Conversaciones Iniciadas este mes</p>
        {usage.monthly.addOnLimit > 0 && (
          <p className="text-xs text-neutral-500 mt-1">
            ({usage.monthly.baseLimit} del plan + {usage.monthly.addOnLimit} adicionales)
          </p>
        )}
      </div>

      <div className="w-full bg-neutral-700 rounded-full h-3 mb-4">
        <div 
          className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${Math.min(progressValue, 100)}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-sm text-neutral-400 mb-4">
        <span>0</span>
        <span className={getTextColor()}>{progressValue}%</span>
        <span>{monthlyLimit}</span>
      </div>

      <p className="text-sm text-neutral-300 mb-6 text-center">
        Te quedan <strong className={getTextColor()}>{usage.monthly.remaining}</strong> conversaciones iniciadas.
      </p>

      {(usage.status === 'warning' || usage.status === 'critical') && (
        <div className="text-center">
          <Button
            onClick={handleBuyAddOn}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            disabled={buyLoading}
          >
            {buyLoading ? 'Procesando...' : 'Comprar Paquete de Conversaciones Adicionales'}
          </Button>
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-6 text-center">
        Recuerda: Las conversaciones de respuesta a clientes activos son ilimitadas y no consumen tu cuota.
      </p>
    </div>
  );
}