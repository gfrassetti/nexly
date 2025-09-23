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
    provider: { type: String, enum: ["whatsapp", "instagram", "messenger"], required: true },
    externalMessageId: { type: String }, // ID del mensaje en el proveedor externo (WhatsApp, etc.)
    integration: { type: Schema.Types.ObjectId, ref: "Integration" }, // Referencia a la integración
  },
  { timestamps: true }
);

export const Message = model("Message", messageSchema);
