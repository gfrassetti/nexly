import { Schema, model, Document, Types } from "mongoose";

export interface IntegrationDoc extends Document {
  // 👇 Debe ser ObjectId porque en el schema usás Schema.Types.ObjectId
  userId: Types.ObjectId;
  provider: "whatsapp" | "instagram" | "messenger";
  externalId: string;
  phoneNumberId?: string;
  accessToken?: string;
  name?: string;
  status?: "pending" | "linked" | "error";
  meta?: {
    displayPhone?: string;
    verifiedName?: string;
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
      enum: ["whatsapp", "instagram", "messenger"],
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
