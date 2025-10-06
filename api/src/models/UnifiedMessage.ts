import { Schema, model, Document, Types } from "mongoose";

export interface UnifiedMessageDoc extends Document {
  // ID único del mensaje en NEXLY
  messageId: string;
  
  // Conversación unificada a la que pertenece
  conversationId: string;
  
  // Usuario de NEXLY propietario
  userId: Types.ObjectId;
  
  // Información del mensaje original
  originalMessage: {
    // ID del mensaje en el sistema externo (WhatsApp, Telegram, etc.)
    externalMessageId: string;
    // Canal de origen
    channel: 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
    // Timestamp del mensaje original
    originalTimestamp: Date;
    // Metadatos específicos del canal
    metadata?: {
      // WhatsApp
      whatsappMessageId?: string;
      whatsappPhoneNumberId?: string;
      // Instagram
      instagramMessageId?: string;
      instagramUserId?: string;
      // Telegram
      telegramMessageId?: number;
      telegramChatId?: number;
      // Messenger
      messengerMessageId?: string;
      messengerPsid?: string;
    };
  };
  
  // Contenido del mensaje
  content: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'other';
    // Para mensajes multimedia
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    // Para ubicaciones
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    // Para contactos
    contact?: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  
  // Dirección del mensaje
  direction: 'inbound' | 'outbound';
  
  // Estado del mensaje
  status: 'sent' | 'delivered' | 'read' | 'failed';
  
  // Información del remitente/destinatario
  participant: {
    // ID del participante en el sistema externo
    externalId: string;
    // Nombre del participante
    name?: string;
    // Tipo de participante
    type: 'user' | 'contact' | 'bot' | 'system';
  };
  
  // Respuesta a otro mensaje (para hilos)
  replyTo?: {
    messageId: string;
    text?: string;
  };
  
  // Etiquetas del mensaje
  tags: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const unifiedMessageSchema = new Schema<UnifiedMessageDoc>(
  {
    messageId: { 
      type: String, 
      required: true, 
      unique: true,
      default: () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    conversationId: { 
      type: String, 
      required: true,
      ref: 'UnifiedConversation'
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    originalMessage: {
      externalMessageId: { type: String, required: true },
      channel: { 
        type: String, 
        enum: ['whatsapp', 'instagram', 'messenger', 'telegram'],
        required: true 
      },
      originalTimestamp: { type: Date, required: true },
      metadata: {
        whatsappMessageId: { type: String },
        whatsappPhoneNumberId: { type: String },
        instagramMessageId: { type: String },
        instagramUserId: { type: String },
        telegramMessageId: { type: Number },
        telegramChatId: { type: Number },
        messengerMessageId: { type: String },
        messengerPsid: { type: String }
      }
    },
    content: {
      text: { type: String },
      type: { 
        type: String, 
        enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'other'],
        required: true 
      },
      mediaUrl: { type: String },
      mediaType: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
      },
      contact: {
        name: { type: String },
        phone: { type: String },
        email: { type: String }
      }
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    participant: {
      externalId: { type: String, required: true },
      name: { type: String },
      type: { 
        type: String, 
        enum: ['user', 'contact', 'bot', 'system'],
        default: 'contact'
      }
    },
    replyTo: {
      messageId: { type: String },
      text: { type: String }
    },
    tags: [{ type: String }]
  },
  { 
    timestamps: true, 
    versionKey: false 
  }
);

// Índices para optimizar consultas
unifiedMessageSchema.index({ conversationId: 1, createdAt: -1 });
unifiedMessageSchema.index({ userId: 1, createdAt: -1 });
unifiedMessageSchema.index({ 'originalMessage.externalMessageId': 1, 'originalMessage.channel': 1 });
unifiedMessageSchema.index({ messageId: 1 });
unifiedMessageSchema.index({ 'participant.externalId': 1 });

// Índice compuesto para evitar duplicados
unifiedMessageSchema.index(
  { 
    'originalMessage.externalMessageId': 1, 
    'originalMessage.channel': 1,
    userId: 1
  },
  { unique: true }
);

export const UnifiedMessage = model<UnifiedMessageDoc>(
  "UnifiedMessage",
  unifiedMessageSchema
);
