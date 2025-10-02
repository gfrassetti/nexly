// src/models/User.ts
import { Schema, model, HydratedDocument } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string; // hash bcrypt
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  subscription_status?: 'none' | 'trial_pending_payment_method' | 'active_trial' | 'active_paid' | 'cancelled';
  selectedPlan?: 'basic' | 'premium'; // Plan seleccionado durante el registro
  freeTrialUsed?: boolean; // Si ya usó el período de prueba gratuito de 24h
  freeTrialStartDate?: Date; // Fecha de inicio del período de prueba gratuito
  freeTrialEndDate?: Date; // Fecha de fin del período de prueba gratuito
  // Métodos del período de prueba gratuito
  startFreeTrial(): void;
  isFreeTrialActive(): boolean;
  canUseFreeTrial(): boolean;
  getFreeTrialTimeRemaining(): number;
}

// Documento “vivo” que retorna Mongoose al hacer .create/.find
export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    username: String,
    email: String,
    password: String,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    subscription_status: {
      type: String,
      enum: ['none', 'trial_pending_payment_method', 'active_trial', 'active_paid', 'cancelled'],
      default: 'none'
    },
    selectedPlan: {
      type: String,
      enum: ['basic', 'premium'],
      default: 'basic'
    },
    freeTrialUsed: {
      type: Boolean,
      default: false
    },
    freeTrialStartDate: {
      type: Date
    },
    freeTrialEndDate: {
      type: Date
    },
  },
  { timestamps: true }
);

// Métodos para el período de prueba gratuito
userSchema.methods.startFreeTrial = function(): void {
  if (!this.freeTrialUsed) {
    const now = new Date();
    const endDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
    
    this.freeTrialStartDate = now;
    this.freeTrialEndDate = endDate;
    this.freeTrialUsed = true;
  }
};

userSchema.methods.isFreeTrialActive = function(): boolean {
  if (!this.freeTrialUsed || !this.freeTrialEndDate) {
    return false;
  }
  return new Date() < this.freeTrialEndDate;
};

userSchema.methods.canUseFreeTrial = function(): boolean {
  return !this.freeTrialUsed;
};

userSchema.methods.getFreeTrialTimeRemaining = function(): number {
  if (!this.freeTrialEndDate || !this.isFreeTrialActive()) {
    return 0;
  }
  return Math.max(0, this.freeTrialEndDate.getTime() - Date.now());
};

export const User = model<IUser>("User", userSchema);
