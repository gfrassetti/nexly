// src/models/Contact.ts
import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    phone: String,
    email: String,
    integrationId: { type: String },
    
    // Información adicional por plataforma
    provider: { 
      type: String, 
      enum: ["whatsapp", "telegram", "instagram", "messenger"],
      required: true 
    },
    externalId: { type: String }, // ID del contacto en la plataforma externa
    
    // Información visual
    avatar: String, // URL del avatar
    profilePicture: String, // URL de la foto de perfil
    
    // Metadata de la plataforma
    platformData: {
      // Telegram
      telegramUserId: Number,
      telegramUsername: String,
      firstName: String,
      lastName: String,
      
      // WhatsApp/Meta
      waId: String,
      profileName: String,
      
      // Instagram/Messenger
      igId: String,
      pageId: String,
    },
    
    // Información de interacción
    lastInteraction: { type: Date },
    lastMessagePreview: String,
    unreadCount: { type: Number, default: 0 },
    
    // Organización
    tags: [String],
    notes: String,
    isFavorite: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    
    // Status
    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active"
    }
  },
  { timestamps: true }
);

// Índices para búsqueda rápida
contactSchema.index({ userId: 1, provider: 1 });
contactSchema.index({ userId: 1, integrationId: 1 });
contactSchema.index({ userId: 1, externalId: 1, provider: 1 });
contactSchema.index({ userId: 1, lastInteraction: -1 });

export const Contact = model("Contact", contactSchema);
