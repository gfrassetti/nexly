import { Schema, model, Document, Types } from "mongoose";

export interface TelegramSessionDoc extends Document {
  userId: Types.ObjectId;
  phoneNumber: string;
  sessionString: string; // String de sesión de Telegram
  phoneCodeHash?: string; // Hash del código de verificación de Telegram
  isActive: boolean;
  lastActivity: Date;
  userInfo?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
  };
  authState: 'pending_phone' | 'pending_code' | 'pending_password' | 'authenticated' | 'error';
  twoFactorPassword?: string; // Para 2FA si está habilitado
  createdAt: Date;
  updatedAt: Date;
}

const telegramSessionSchema = new Schema<TelegramSessionDoc>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      unique: true // Un usuario solo puede tener una sesión activa
    },
    phoneNumber: { 
      type: String, 
      required: true,
      unique: true // Un número de teléfono solo puede estar en una sesión
    },
    sessionString: { 
      type: String, 
      required: false, // No requerido inicialmente, se llenará después de la autenticación
      sparse: true // Permite múltiples documentos con sessionString undefined/null
    },
    phoneCodeHash: { 
      type: String,
      unique: false // No debe ser único, se reutiliza
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    lastActivity: { 
      type: Date, 
      default: Date.now 
    },
    userInfo: {
      id: { type: Number },
      username: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      phoneNumber: { type: String }
    },
    authState: {
      type: String,
      enum: ['pending_phone', 'pending_code', 'pending_password', 'authenticated', 'error'],
      default: 'pending_phone'
    },
    twoFactorPassword: { type: String }
  },
  { 
    timestamps: true, 
    versionKey: false 
  }
);

// Índices para optimizar consultas
telegramSessionSchema.index({ userId: 1 });
telegramSessionSchema.index({ phoneNumber: 1 });
telegramSessionSchema.index({ isActive: 1 });
telegramSessionSchema.index({ authState: 1 });

export const TelegramSession = model<TelegramSessionDoc>(
  "TelegramSession",
  telegramSessionSchema
);
