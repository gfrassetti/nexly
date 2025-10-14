"use client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const { user, logout } = useAuth();
  const { subscription, status } = useSubscription();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  const getPlanBadge = () => {
    if (!subscription?.subscription) return null;
    
    const sub = subscription.subscription;
    const rawStatus = sub.status;
    
    
    let planText = '';
    let badgeColor = '';
    
    // Lógica mejorada: Si tiene stripeSubscriptionId, significa que ya pagó
    const hasStripeSubscription = sub.stripeSubscriptionId;
    
    // Si tiene Stripe subscription ID, significa que ya pagó, independientemente del status
    if (hasStripeSubscription) {
      planText = sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise';
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-green border border-accent-green/30';
    } else if (rawStatus === 'trialing') {
      planText = `${sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise'} Trial`;
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-blue border border-accent-blue/30';
    } else if (rawStatus === 'active') {
      planText = sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise';
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-green border border-accent-green/30';
    } else if (rawStatus === 'paused') {
      planText = `${sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise'} (Pausado)`;
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-cream border border-accent-cream/30';
    } else if (rawStatus === 'past_due' || rawStatus === 'unpaid') {
      planText = `${sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise'} (Gracia)`;
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-warning border border-warning/30';
    } else if (rawStatus === 'canceled') {
      planText = `${sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise'} (Cancelado)`;
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30'
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-muted-foreground border border-border';
    } else {
      // Estado por defecto - mostrar el plan
      planText = sub.planType === 'basic' ? 'Basic' : sub.planType === 'premium' ? 'Premium' : 'Enterprise';
      badgeColor = sub.planType === 'premium' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'enterprise'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-muted-foreground border border-border';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-transparent ${badgeColor}`}>
        {planText}
      </span>
    );
  };

  const getTrialProgress = () => {
    if (!subscription?.subscription) return null;
    
    const sub = subscription.subscription;
    const rawStatus = sub.status;
    
    // Solo mostrar progress bar si está en trial
    if (rawStatus !== 'trialing') return null;
    
    const trialEndDate = new Date(sub.trialEndDate);
    const now = new Date();
    const totalTrialDays = 14; // 14 días de trial
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysUsed = totalTrialDays - daysRemaining;
    const progressPercentage = (daysUsed / totalTrialDays) * 100;
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-blue transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        <span className="text-xs text-neutral-400">
          {daysRemaining}d restantes
        </span>
      </div>
    );
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-accent-dark">
      <div className="text-sm text-neutral-300">Panel</div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-neutral-300">
              Hola, {user.username}
            </span>
            {getPlanBadge()}
            {getTrialProgress()}
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
