"use client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function Topbar() {
  const { user, clear } = useAuth();
  const { subscription } = useSubscription();

  const handleLogout = () => {
    // Limpiar localStorage
    localStorage.removeItem("token");
    
    // Limpiar cookie
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    
    // Limpiar estado de Zustand
    clear();
    
    // Forzar recarga completa para limpiar todo el estado
    window.location.replace("/login");
  };

  const getPlanBadge = () => {
    if (!subscription?.subscription) return null;
    
    const sub = subscription.subscription;
    const isTrialActive = sub.isTrialActive;
    const isActive = sub.isActive;
    const isPaused = sub.isPaused;
    const isInGracePeriod = sub.isInGracePeriod;
    
    let planText = '';
    let badgeColor = '';
    
    if (isTrialActive) {
      planText = 'Free Trial';
      badgeColor = 'bg-blue-600 text-white';
    } else if (isActive) {
      planText = sub.planType === 'basic' ? 'Basic' : 'Premium';
      badgeColor = sub.planType === 'basic' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white';
    } else if (isPaused) {
      planText = `${sub.planType === 'basic' ? 'Basic' : 'Premium'} (Pausado)`;
      badgeColor = 'bg-orange-600 text-white';
    } else if (isInGracePeriod) {
      planText = `${sub.planType === 'basic' ? 'Basic' : 'Premium'} (Gracia)`;
      badgeColor = 'bg-yellow-600 text-white';
    } else {
      planText = 'Free';
      badgeColor = 'bg-gray-600 text-white';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
        {planText}
      </span>
    );
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-neutral-900">
      <div className="text-sm text-neutral-300">Panel</div>
      <div className="flex items-center gap-2">
        {user && (
          <>
            <span className="text-sm text-neutral-300">
              Hola, {user.username}
            </span>
            {getPlanBadge()}
          </>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
