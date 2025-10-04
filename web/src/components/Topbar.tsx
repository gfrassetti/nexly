"use client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const { user, clear } = useAuth();
  const { subscription, status } = useSubscription();
  const router = useRouter();

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
    
    let planText = '';
    let badgeColor = '';
    
    if (status.trialActive) {
      planText = `${sub.planType === 'basic' ? 'Basic' : 'Premium'} Trial`;
      badgeColor = 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30';
    } else if (status.active) {
      planText = sub.planType === 'basic' ? 'Basic' : 'Premium';
      badgeColor = sub.planType === 'basic' ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30';
    } else if (status.paused) {
      planText = `${sub.planType === 'basic' ? 'Basic' : 'Premium'} (Pausado)`;
      badgeColor = 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30';
    } else if (status.inGracePeriod) {
      planText = `${sub.planType === 'basic' ? 'Basic' : 'Premium'} (Gracia)`;
      badgeColor = 'bg-warning/20 text-warning border border-warning/30';
    } else {
      // Si no está en ningún estado activo, mostrar el plan base
      planText = sub.planType === 'basic' ? 'Basic' : 'Premium';
      badgeColor = 'bg-muted text-muted-foreground border border-border';
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
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm transition-colors duration-200"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
