import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAddOnPurchase extends Document {
  userId: Types.ObjectId;
  planType: 'crecimiento' | 'pro' | 'business';
  conversationsAdded: number;
  amountPaid: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchaseDate: Date;
  effectiveDate: Date;
  expirationDate: Date;
  metadata?: {
    source: 'emergency_modal' | 'preventive_dashboard';
    userAgent?: string;
    ipAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AddOnPurchaseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    planType: {
      type: String,
      enum: ['crecimiento', 'pro', 'business'],
      required: true
    },
    conversationsAdded: {
      type: Number,
      required: true,
      default: 500
    },
    amountPaid: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    expirationDate: {
      type: Date,
      required: true
    },
    metadata: {
      source: {
        type: String,
        enum: ['emergency_modal', 'preventive_dashboard'],
        default: 'emergency_modal'
      },
      userAgent: String,
      ipAddress: String
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas
AddOnPurchaseSchema.index({ userId: 1, effectiveDate: 1 });
AddOnPurchaseSchema.index({ stripeSessionId: 1 });
AddOnPurchaseSchema.index({ status: 1 });

// Método para verificar si el add-on está activo
AddOnPurchaseSchema.methods.isActive = function(): boolean {
  const now = new Date();
  return this.status === 'completed' && 
         this.effectiveDate <= now && 
         this.expirationDate > now;
};

// Método para calcular conversaciones restantes del add-on
AddOnPurchaseSchema.methods.getRemainingConversations = function(): number {
  if (!this.isActive()) return 0;
  
  // Si el add-on expira al final del mes, retornar todas las conversaciones
  // Si ya pasó el mes, retornar 0
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  if (now > endOfMonth) return 0;
  return this.conversationsAdded;
};

export default mongoose.model<IAddOnPurchase>('AddOnPurchase', AddOnPurchaseSchema);
