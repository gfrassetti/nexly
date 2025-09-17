// src/models/Message.ts
import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    direction: { type: String, enum: ["in", "out"], required: true }, // in = entrante, out = saliente
    body: { type: String, required: true },
  },
  { timestamps: true }
);

export const Message = model("Message", messageSchema);
