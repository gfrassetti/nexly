import { useSubscription } from '@/contexts/SubscriptionContext';

export function SubscriptionBadge() {
  const { status } = useSubscription();

  if (status.isPaid) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
        <span className="text-sm font-medium">Plan Activo</span>
      </div>
    );
  }

  if (status.isTrial) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
        <span className="text-sm font-medium">Período de Prueba</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-gray-500">
      <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
      <span className="text-sm font-medium">Plan Gratuito</span>
    </div>
  );
}
