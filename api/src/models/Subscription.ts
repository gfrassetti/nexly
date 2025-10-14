// api/src/models/Subscription.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  planType: 'basic' | 'premium' | 'enterprise';
  status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
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
  // Los estados se calculan dinámicamente con métodos
  lastPaymentDate?: Date;
  lastPaymentAttempt?: Date;
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
    enum: ['basic', 'premium', 'enterprise'],
    required: true,
  },
  status: {
    type: String,
    enum: ['trialing', 'active', 'incomplete', 'incomplete_expired', 'past_due', 'canceled', 'unpaid', 'paused'],
    default: 'trialing',
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
  // Campos adicionales para estados de Stripe (solo fechas y IDs)
  // Los estados se calculan dinámicamente con métodos
  lastPaymentDate: {
    type: Date,
  },
  lastPaymentAttempt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Índices para optimizar consultas
SubscriptionSchema.index({ userId: 1 });
// stripeSubscriptionId ya tiene índice único sparse en la definición del campo
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ trialEndDate: 1 });

// Métodos del schema - actualizados para estados de Stripe
SubscriptionSchema.methods.isTrialActive = function(): boolean {
  return this.status === 'trialing' && new Date() < this.trialEndDate;
};

SubscriptionSchema.methods.isActive = function(): boolean {
  const now = new Date();
  
  // Si está en período de gracia y no ha expirado (legacy)
  if (this.status === 'grace_period' && this.gracePeriodEndDate && now < this.gracePeriodEndDate) {
    return true;
  }
  
  // Estados activos de Stripe
  return this.status === 'active' && (!this.endDate || now < this.endDate);
};

SubscriptionSchema.methods.isPaused = function(): boolean {
  return this.status === 'paused';
};

SubscriptionSchema.methods.isCancelled = function(): boolean {
  return this.status === 'canceled';
};

SubscriptionSchema.methods.isInGracePeriod = function(): boolean {
  const now = new Date();
  return this.status === 'grace_period' && this.gracePeriodEndDate && now < this.gracePeriodEndDate;
};

// Nuevos métodos para estados de Stripe
SubscriptionSchema.methods.isIncomplete = function(): boolean {
  return this.status === 'incomplete';
};

SubscriptionSchema.methods.isPastDue = function(): boolean {
  return this.status === 'past_due';
};

SubscriptionSchema.methods.isUnpaid = function(): boolean {
  return this.status === 'unpaid';
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
  
  
    return this.planType === 'basic' ? 3 : this.planType === 'premium' ? 10 : 999; // Básico: 3, Premium: 10, Enterprise: sin límite
};

// Método estático para obtener límite de integraciones considerando período de prueba gratuito
SubscriptionSchema.statics.getMaxIntegrationsForUser = async function(userId: string): Promise<number> {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  // Verificar si tiene alguna suscripción primero
  const subscription = await this.findOne({ userId });
  
  if (subscription) {
    // Si tiene suscripción (aunque esté cancelada/pausada), usar límites de suscripción
    return subscription.getMaxIntegrations();
  } else {
    // Solo si NO tiene ninguna suscripción, verificar período de prueba gratuito
    if (user && user.isFreeTrialActive()) {
      return 2;
    }
    return 0; // Sin suscripción ni período de prueba = sin integraciones
  }
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

// Método para cancelar suscripción - actualizado para Stripe
SubscriptionSchema.methods.cancelSubscription = function(gracePeriodDays: number = 7): void {
  if (this.status === 'active' || this.status === 'paused') {
    // Para Stripe, usar 'canceled' directamente o 'grace_period' si queremos período de gracia
    this.status = 'canceled'; // O 'grace_period' si queremos período de gracia
    this.cancelledAt = new Date();
    this.autoRenew = false;
    
    // Calcular período de gracia si usamos 'grace_period'
    if (gracePeriodDays > 0) {
      this.status = 'grace_period';
      const graceEndDate = new Date();
      graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);
      this.gracePeriodEndDate = graceEndDate;
    }
  }
};

// Método para verificar si debe expirar - actualizado para Stripe
SubscriptionSchema.methods.checkExpiration = function(): boolean {
  const now = new Date();
  
  // Si está en período de gracia y ha expirado
  if (this.status === 'grace_period' && this.gracePeriodEndDate && now >= this.gracePeriodEndDate) {
    this.status = 'canceled'; // Usar 'canceled' en lugar de 'expired'
    return true;
  }
  
  // Si está activo y ha expirado
  if (this.status === 'active' && this.endDate && now >= this.endDate) {
    this.status = 'canceled'; // Usar 'canceled' en lugar de 'expired'
    return true;
  }
  
  return false;
};

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
