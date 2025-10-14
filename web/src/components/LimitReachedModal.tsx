"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useConversationUsage } from '@/hooks/useConversationUsage';
import { useBuyAddOn } from '@/hooks/useAddOns';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradePlan: () => void;
}

export default function LimitReachedModal({
  isOpen,
  onClose,
  onUpgradePlan,
}: LimitReachedModalProps) {
  const { usage, refetch } = useConversationUsage();
  const { buyAddOn, loading: buyLoading } = useBuyAddOn();

  const handleBuyAddOn = async () => {
    const result = await buyAddOn('emergency_modal');
    if (result) {
      // Refetch usage after successful purchase
      setTimeout(refetch, 2000);
      onClose();
    }
  };

  if (!usage) return null;

  const progressValue = usage.monthly.percentage;
  const currentUsage = usage.monthly.used;
  const monthlyLimit = usage.monthly.limit;

  const getPlanName = () => {
    // Esto debería venir del contexto del usuario, por ahora usamos un mapeo básico
    const baseLimit = usage.monthly.baseLimit;
    if (baseLimit <= 450) return 'Crecimiento';
    if (baseLimit <= 1500) return 'Pro';
    return 'Business';
  };

  const planType = getPlanName();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="bg-accent-dark border border-neutral-700 rounded-lg shadow-xl max-w-md w-full p-6 relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-accent-cream transition-colors"
              disabled={buyLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-accent-cream mb-2">¡Límite de WhatsApp Alcanzado!</h3>
              <p className="text-neutral-300 text-sm">
                Has usado tu cuota de <strong className="text-orange-400">{currentUsage} / {monthlyLimit} Conversaciones Iniciadas en WhatsApp</strong> de este mes.
              </p>
            </div>

            <div className="mb-6">
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div 
                  className="h-2 bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressValue, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-neutral-400 mt-2 text-center">
                {monthlyLimit - currentUsage} conversaciones restantes
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <Button
                onClick={handleBuyAddOn}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
                disabled={buyLoading}
              >
                {buyLoading ? 'Procesando...' : 'Comprar 500 Conversaciones de WhatsApp ($30 USD)'}
              </Button>
              {planType !== 'Business' && (
                <Button
                  onClick={onUpgradePlan}
                  className="w-full bg-nexly-teal hover:bg-nexly-teal-dark text-accent-cream font-semibold py-2 rounded-lg transition-colors"
                  variant="outline"
                  disabled={buyLoading}
                >
                  Subir a Plan {planType === 'Crecimiento' ? 'Pro' : 'Business'}
                </Button>
              )}
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Recuerda: Las conversaciones de respuesta a clientes activos son ilimitadas y no consumen tu cuota.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}