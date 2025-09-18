import { Schema, model, Document } from "mongoose";

export interface IntegrationDoc extends Document {
  userId: string;
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
  createdAt?: Date;   // 👈 agregados
  updatedAt?: Date;   // 👈 agregados
}

const integrationSchema = new Schema<IntegrationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["whatsapp", "instagram", "messenger"],
      required: true,
    },
    // Para WhatsApp Cloud: phone_number_id
    externalId: { type: String, required: true },

    // Opcional (si no lo mandás, igualamos a externalId)
    phoneNumberId: { type: String },

    // Token por integración (en caso de que no uses global de app)
    accessToken: { type: String },

    name: String,

    status: {
      type: String,
      enum: ["pending", "linked", "error"],
      default: "pending",
    },

    meta: {
      displayPhone: String,
      verifiedName: String,
    },
  },
  { timestamps: true } // 👈 esto crea createdAt/updatedAt automáticamente
);

// ÚNICA por usuario + proveedor + externalId
integrationSchema.index({ userId: 1, provider: 1, externalId: 1 }, { unique: true });

export const Integration = model<IntegrationDoc>("Integration", integrationSchema);
