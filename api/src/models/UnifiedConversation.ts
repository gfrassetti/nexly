import { Schema, model, Document, Types } from "mongoose";

export interface UnifiedConversationDoc extends Document {
  // Identificador único de la conversación en NEXLY
  conversationId: string; // Generado automáticamente
  
  // Usuario de NEXLY que posee esta conversación
  userId: Types.ObjectId;
  
  // Información del contacto/participante externo
  externalContact: {
    // Identificador único del contacto (puede ser phone, telegram_id, instagram_id, etc.)
    externalId: string;
    // Tipo de canal de origen
    channel: 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
    // Información del contacto
    name?: string;
    username?: string;
    phoneNumber?: string;
    profilePicture?: string;
    // Metadatos específicos del canal
    metadata?: {
      // WhatsApp
      whatsappPhoneNumberId?: string;
      // Instagram
      instagramUserId?: string;
      // Telegram
      telegramUserId?: number;
      telegramUsername?: string;
      // Messenger
      messengerPsid?: string;
    };
  };
  
  // Estado de la conversación
  status: 'active' | 'archived' | 'blocked';
  
  // Última actividad
  lastMessageAt: Date;
  lastMessageFrom: 'user' | 'contact'; // Quién envió el último mensaje
  
  // Contador de mensajes no leídos
  unreadCount: number;
  
  // Etiquetas para organización
  tags: string[];
  
  // Notas internas del usuario
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const unifiedConversationSchema = new Schema<UnifiedConversationDoc>(
  {
    conversationId: { 
      type: String, 
      required: true, 
      unique: true,
      default: () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    externalContact: {
      externalId: { type: String, required: true },
      channel: { 
        type: String, 
        enum: ['whatsapp', 'instagram', 'messenger', 'telegram'],
        required: true 
      },
      name: { type: String },
      username: { type: String },
      phoneNumber: { type: String },
      profilePicture: { type: String },
      metadata: {
        whatsappPhoneNumberId: { type: String },
        instagramUserId: { type: String },
        telegramUserId: { type: Number },
        telegramUsername: { type: String },
        messengerPsid: { type: String }
      }
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'blocked'],
      default: 'active'
    },
    lastMessageAt: { 
      type: Date, 
      default: Date.now 
    },
    lastMessageFrom: {
      type: String,
      enum: ['user', 'contact'],
      default: 'contact'
    },
    unreadCount: { 
      type: Number, 
      default: 0 
    },
    tags: [{ type: String }],
    notes: { type: String }
  },
  { 
    timestamps: true, 
    versionKey: false 
  }
);

// Índices para optimizar consultas
unifiedConversationSchema.index({ userId: 1, status: 1 });
unifiedConversationSchema.index({ 'externalContact.externalId': 1, 'externalContact.channel': 1 });
unifiedConversationSchema.index({ lastMessageAt: -1 });
unifiedConversationSchema.index({ conversationId: 1 });

// Índice compuesto único para evitar duplicados
unifiedConversationSchema.index(
  { 
    userId: 1, 
    'externalContact.externalId': 1, 
    'externalContact.channel': 1 
  },
  { unique: true }
);

export const UnifiedConversation = model<UnifiedConversationDoc>(
  "UnifiedConversation",
  unifiedConversationSchema
);
