// src/models/Contact.ts
import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    phone: String,
    email: String,
    integrationId: { type: String }
  },
  { timestamps: true }
);


export const Contact = model("Contact", contactSchema);
