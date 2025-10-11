import { Schema, model } from "mongoose";

const archiveSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    integrationId: { type: String, required: true },
    provider: { 
      type: String, 
      enum: ["whatsapp", "telegram", "instagram", "messenger"],
      required: true 
    },
    
    // Datos del contacto al momento de archivarlo (snapshot)
    contactSnapshot: {
      name: String,
      phone: String,
      email: String,
      avatar: String,
      profilePicture: String,
      platformData: {
        telegramUserId: Number,
        telegramUsername: String,
        firstName: String,
        lastName: String,
        waId: String,
        profileName: String,
        igId: String,
        pageId: String,
      }
    },
    
    // Información de archivado
    archivedAt: { type: Date, default: Date.now },
    archivedBy: { type: String, default: "user" }, // "user" o "system"
    reason: { type: String, default: "manual" }, // "manual", "inactive", etc.
    
    // Metadata
    notes: String,
    tags: [String],
  },
  { timestamps: true }
);

// Índices para búsqueda rápida
archiveSchema.index({ userId: 1, contactId: 1 }, { unique: true });
archiveSchema.index({ userId: 1, provider: 1 });
archiveSchema.index({ userId: 1, integrationId: 1 });
archiveSchema.index({ userId: 1, archivedAt: -1 });

export const Archive = model("Archive", archiveSchema);
