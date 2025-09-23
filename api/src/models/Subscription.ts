// api/src/models/Subscription.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  planType: 'basic' | 'premium';
  status: 'trial' | 'active' | 'paused' | 'cancelled' | 'expired' | 'grace_period' | 'past_due';
  mercadoPagoSubscriptionId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  startDate: Date;
  endDate?: Date;
  trialEndDate: Date;
  autoRenew: boolean;
  // Nuevos campos para manejar pausas y cancelaciones
  pausedAt?: Date;
  cancelledAt?: Date;
  gracePeriodEndDate?: Date;
  originalEndDate?: Date; // Para restaurar después de reactivar
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  planType: {
    type: String,
    enum: ['basic', 'premium'],
    required: true,
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'paused', 'cancelled', 'expired', 'grace_period', 'past_due'],
    default: 'trial',
  },
  mercadoPagoSubscriptionId: {
    type: String,
    unique: true,
    sparse: true, // Permite valores únicos pero también null/undefined
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true, // Permite valores únicos pero también null/undefined
  },
  stripeSessionId: {
    type: String,
    unique: true,
    sparse: true, // Permite valores únicos pero también null/undefined
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  trialEndDate: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  // Nuevos campos para manejar pausas y cancelaciones
  pausedAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  gracePeriodEndDate: {
    type: Date,
  },
  originalEndDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Índices para optimizar consultas
SubscriptionSchema.index({ userId: 1 });
// mercadoPagoSubscriptionId, stripeSubscriptionId y stripeSessionId ya tienen índices únicos sparse en la definición del campo
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ trialEndDate: 1 });

// Métodos del schema
SubscriptionSchema.methods.isTrialActive = function(): boolean {
  return this.status === 'trial' && new Date() < this.trialEndDate;
};

SubscriptionSchema.methods.isActive = function(): boolean {
  const now = new Date();
  
  // Si está en período de gracia y no ha expirado
  if (this.status === 'grace_period' && this.gracePeriodEndDate && now < this.gracePeriodEndDate) {
    return true;
  }
  
  // Si está activo y no ha expirado
  return this.status === 'active' && (!this.endDate || now < this.endDate);
};

SubscriptionSchema.methods.isPaused = function(): boolean {
  return this.status === 'paused';
};

SubscriptionSchema.methods.isCancelled = function(): boolean {
  return this.status === 'cancelled' || this.status === 'expired';
};

SubscriptionSchema.methods.isInGracePeriod = function(): boolean {
  const now = new Date();
  return this.status === 'grace_period' && this.gracePeriodEndDate && now < this.gracePeriodEndDate;
};

SubscriptionSchema.methods.canUseFeature = function(feature: string): boolean {
  if (this.isTrialActive() || this.isActive()) {
    return true; // Durante el trial, acceso completo
  }
  
  // Lógica para diferentes features según el plan
  const planFeatures = {
    basic: ['whatsapp', 'instagram'],
    premium: ['whatsapp', 'instagram', 'messenger', 'tiktok', 'telegram', 'twitter']
  };
  
    return planFeatures[this.planType as keyof typeof planFeatures]?.includes(feature) || false;
};

SubscriptionSchema.methods.getMaxIntegrations = function(): number {
  if (this.isTrialActive()) {
    return 999; // Durante el trial, acceso completo
  }
  
  // Si está pausada o cancelada, volver al plan básico
  if (this.isPaused() || this.isCancelled()) {
    return 2; // Solo WhatsApp e Instagram
  }
  
  
  return this.planType === 'basic' ? 2 : 999; // Básico: 2 integraciones, Premium: ilimitadas
};

// Método para pausar suscripción
SubscriptionSchema.methods.pauseSubscription = function(): void {
  if (this.status === 'active') {
    this.status = 'paused';
    this.pausedAt = new Date();
    this.originalEndDate = this.endDate;
    this.autoRenew = false;
  }
};

// Método para reactivar suscripción
SubscriptionSchema.methods.reactivateSubscription = function(): void {
  if (this.status === 'paused') {
    this.status = 'active';
    this.endDate = this.originalEndDate;
    this.autoRenew = true;
    this.pausedAt = undefined;
    this.originalEndDate = undefined;
  }
};

// Método para cancelar suscripción con período de gracia
SubscriptionSchema.methods.cancelSubscription = function(gracePeriodDays: number = 7): void {
  if (this.status === 'active' || this.status === 'paused') {
    this.status = 'grace_period';
    this.cancelledAt = new Date();
    this.autoRenew = false;
    
    // Calcular período de gracia
    const graceEndDate = new Date();
    graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);
    this.gracePeriodEndDate = graceEndDate;
  }
};

// Método para verificar si debe expirar
SubscriptionSchema.methods.checkExpiration = function(): boolean {
  const now = new Date();
  
  // Si está en período de gracia y ha expirado
  if (this.status === 'grace_period' && this.gracePeriodEndDate && now >= this.gracePeriodEndDate) {
    this.status = 'expired';
    return true;
  }
  
  // Si está activo y ha expirado
  if (this.status === 'active' && this.endDate && now >= this.endDate) {
    this.status = 'expired';
    return true;
  }
  
  return false;
};

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
