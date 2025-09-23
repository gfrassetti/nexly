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
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
