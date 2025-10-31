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
    registeredVia?: string;     // 'meta_embedded_signup' | 'manual' | 'twilio_embedded_signup'
    registrationDate?: Date;
    testMode?: boolean;
    // Twilio Tech Provider Program fields
    wabaId?: string;            // WhatsApp Business Account ID (WABA ID)
    twilioSubaccountSid?: string; // Subaccount SID creado por Twilio (ACxxx)
    twilioSubaccountAuthToken?: string; // AuthToken del subaccount (para uso futuro)
    facebookBusinessId?: string;  // Facebook Business ID del cliente
    senderId?: string;           // Sender ID registrado via Senders API (XExxx)
    senderStatus?: string;       // Status del sender: 'pending' | 'online' | 'offline'
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
      registeredVia: { type: String },     // 'meta_embedded_signup' | 'manual' | 'twilio_embedded_signup'
      registrationDate: { type: Date },
      testMode: { type: Boolean },
      // Twilio Tech Provider Program fields
      wabaId: { type: String },            // WhatsApp Business Account ID (WABA ID)
      twilioSubaccountSid: { type: String }, // Subaccount SID creado por Twilio (ACxxx)
      twilioSubaccountAuthToken: { type: String }, // AuthToken del subaccount (para uso futuro)
      facebookBusinessId: { type: String },  // Facebook Business ID del cliente
      senderId: { type: String },           // Sender ID registrado via Senders API (XExxx)
      senderStatus: { type: String },       // Status del sender: 'pending' | 'online' | 'offline'
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
