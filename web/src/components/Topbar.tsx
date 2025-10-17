"use client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { id: "resumen", label: "Resumen", href: "/dashboard" },
  { id: "inbox", label: "Inbox", href: "/dashboard/inbox" },
  { id: "contacts", label: "Contactos", href: "/dashboard/contacts" },
  { id: "integrations", label: "Integraciones", href: "/dashboard/integrations" },
  { id: "subscription", label: "Mi Suscripción", href: "/dashboard/subscription" },
];

export default function Topbar() {
  const { user, logout } = useAuth();
  const { subscription, status } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      planText = sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business';
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-green border border-accent-green/30';
    } else if (rawStatus === 'trialing') {
      planText = `${sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business'} Trial`;
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-blue border border-accent-blue/30';
    } else if (rawStatus === 'active') {
      planText = sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business';
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-green border border-accent-green/30';
    } else if (rawStatus === 'paused') {
      planText = `${sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business'} (Pausado)`;
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-accent-cream border border-accent-cream/30';
    } else if (rawStatus === 'past_due' || rawStatus === 'unpaid') {
      planText = `${sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business'} (Gracia)`;
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-warning border border-warning/30';
    } else if (rawStatus === 'canceled') {
      planText = `${sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business'} (Cancelado)`;
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30'
        : sub.planType === 'business'
        ? 'bg-purple-600 text-white border border-purple-600/30'
        : 'text-muted-foreground border border-border';
    } else {
      // Estado por defecto - mostrar el plan
      planText = sub.planType === 'crecimiento' ? 'Crecimiento' : sub.planType === 'pro' ? 'Pro' : 'Business';
      badgeColor = sub.planType === 'pro' 
        ? 'bg-accent-dark text-accent-cream border border-accent-dark/30' 
        : sub.planType === 'business'
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
    
    // Solo mostrar progress bar si está en trial (usando la misma lógica que SubscriptionStatus)
    const isTrialActiveNow = sub.trialEndDate && new Date(sub.trialEndDate) > new Date();
    if (!isTrialActiveNow) return null;
    
    const trialEndDate = new Date(sub.trialEndDate);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calcular el progreso basado en la fecha real de inicio del trial
    // Asumimos que el trial comenzó cuando se creó la suscripción o hace 7 días
    const trialStartDate = new Date(trialEndDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 días antes del trialEndDate
    const totalTrialDays = 7; // 7 días de trial
    const daysUsed = Math.max(0, Math.ceil((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const progressPercentage = Math.min((daysUsed / totalTrialDays) * 100, 100);
    
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
    <>
      <header className="h-12 flex items-center justify-between px-4 bg-accent-dark border-b border-neutral-700">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden lg:block text-sm text-neutral-300">Panel</div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <>
              <span className="hidden sm:block text-sm text-neutral-300">
                Hola, {user.username}
              </span>
              <div className="hidden md:flex items-center gap-2">
                {getPlanBadge()}
                {getTrialProgress()}
              </div>
            </>
          )}
          <button
            onClick={handleLogout}
            className="px-2 sm:px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm transition-colors duration-200"
          >
            <span className="hidden sm:inline">Salir</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-neutral-800 border-b border-neutral-700">
          <nav className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-neutral-700 text-accent-cream"
                    : "text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* Show plan info on mobile */}
            {user && (
              <div className="px-3 py-2 border-t border-neutral-700 mt-2 pt-2">
                <div className="text-xs text-neutral-400 mb-2">Hola, {user.username}</div>
                <div className="flex items-center gap-2">
                  {getPlanBadge()}
                  {getTrialProgress()}
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
