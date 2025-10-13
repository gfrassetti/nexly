// src/models/Message.ts
import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    integrationId: { type: Schema.Types.ObjectId, ref: "Integration" },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    direction: { type: String, enum: ["in", "out"], required: true }, // in = entrante, out = saliente
    body: { type: String, required: true },
    provider: { type: String, enum: ["whatsapp", "instagram", "messenger", "telegram"], required: true },
    externalMessageId: { type: String }, // ID del mensaje en el proveedor externo (WhatsApp, etc.)
    integration: { type: Schema.Types.ObjectId, ref: "Integration" }, // Referencia a la integración
    from: { type: String }, // ID del remitente (número de teléfono, usuario de Telegram, etc.)
    senderName: { type: String }, // Nombre del remitente
    timestamp: { type: Date, default: Date.now }, // Timestamp del mensaje
    
    // Campos para mensajes no leídos
    isRead: { type: Boolean, default: false }, // Si el mensaje fue leído por el usuario
    readAt: { type: Date }, // Timestamp cuando se leyó el mensaje
    
    // Estado del mensaje (para mensajes salientes)
    status: { 
      type: String, 
      enum: ['queued', 'sending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    
    // Campos de error (para mensajes fallidos)
    errorCode: { type: String },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

export const Message = model("Message", messageSchema);
