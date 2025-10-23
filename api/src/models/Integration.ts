import { Schema, model, Document, Types } from "mongoose";

export interface IntegrationDoc extends Document {
  // 👇 Debe ser ObjectId porque en el schema usás Schema.Types.ObjectId
  userId: Types.ObjectId;
  provider: "whatsapp" | "instagram" | "messenger" | "telegram" | "tiktok";
  externalId: string;
  phoneNumberId?: string;
  accessToken?: string;
  name?: string;
  status?: "pending" | "linked" | "error";
  meta?: {
    displayPhone?: string;
    verifiedName?: string;
    // Telegram MTProto specific fields
    telegramUserId?: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhoneNumber?: string;
    sessionString?: string;
    isActive?: boolean;
    // Twilio WhatsApp specific fields (Modelo Master - Cuenta Única)
    channelSid?: string;        // ID del canal de Twilio (MGxxx o WAxxx) - opcional
    whatsappNumber?: string;    // Número de WhatsApp del usuario (whatsapp:+5491112345678)
    registeredVia?: string;     // 'meta_embedded_signup' | 'manual'
    registrationDate?: Date;
    testMode?: boolean;
    // Discord removido - no es posible acceder a conversaciones del usuario
  };
  // timestamps agregados para que TS no proteste en las rutas
  createdAt?: Date;
  updatedAt?: Date;
}

const integrationSchema = new Schema<IntegrationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["whatsapp", "instagram", "messenger", "telegram", "tiktok"],
      required: true,
    },
    externalId: { type: String, required: true },
    phoneNumberId: { type: String },
    accessToken: { type: String },
    name: { type: String },
    status: {
      type: String,
      enum: ["pending", "linked", "error"],
      default: "pending",
    },
    meta: {
      displayPhone: { type: String },
      verifiedName: { type: String },
      // Telegram MTProto specific fields
      telegramUserId: { type: Number },
      telegramUsername: { type: String },
      telegramFirstName: { type: String },
      telegramLastName: { type: String },
      telegramPhoneNumber: { type: String },
      sessionString: { type: String },
      isActive: { type: Boolean, default: true },
      // Twilio WhatsApp specific fields (Modelo Master - Cuenta Única)
      channelSid: { type: String },        // ID del canal de Twilio (opcional)
      whatsappNumber: { type: String },    // Número de WhatsApp (whatsapp:+5491112345678)
      registeredVia: { type: String },     // 'meta_embedded_signup' | 'manual'
      registrationDate: { type: Date },
      testMode: { type: Boolean },
      // Discord removido - no es posible acceder a conversaciones del usuario
    },
  },
  { timestamps: true, versionKey: false }
);

// ÚNICA por usuario + proveedor + externalId
integrationSchema.index(
  { userId: 1, provider: 1, externalId: 1 },
  { unique: true }
);

export const Integration = model<IntegrationDoc>(
  "Integration",
  integrationSchema
);
