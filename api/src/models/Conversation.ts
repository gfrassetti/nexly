// api/src/models/Conversation.ts
import { Schema, model } from "mongoose";

const conversationSchema = new Schema({
  tenantId: { type: String, required: true },
  contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
  channel: { type: String, enum: ["whatsapp","instagram","messenger"], required: true },
  status: { type: String, enum: ["open","closed"], default: "open" }
}, { timestamps: true });

export const Conversation = model("Conversation", conversationSchema);
