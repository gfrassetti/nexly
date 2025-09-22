// api/src/models/MessageLimit.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageLimit extends Document {
  userId: string;
  integrationId: string;
  provider: string;
  date: Date; // Fecha del día (solo año-mes-día)
  messageCount: number; // Contador de mensajes enviados hoy
  maxMessages: number; // Límite máximo para este plan
  createdAt: Date;
  updatedAt: Date;
}

const MessageLimitSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  integrationId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Integration',
  },
  provider: {
    type: String,
    required: true,
    enum: ['whatsapp', 'instagram', 'messenger', 'tiktok', 'telegram', 'twitter'],
  },
  date: {
    type: Date,
    required: true,
    // Index para búsquedas eficientes por fecha
    index: true,
  },
  messageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxMessages: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
});

// Índice compuesto para búsquedas eficientes
MessageLimitSchema.index({ userId: 1, integrationId: 1, date: 1 }, { unique: true });

// Método estático para obtener límite actual del día
MessageLimitSchema.statics.getTodayLimit = async function(userId: string, integrationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Inicio del día
  
  return await this.findOne({
    userId,
    integrationId,
    date: today,
  });
};

// Método estático para incrementar contador de mensajes
MessageLimitSchema.statics.incrementMessageCount = async function(
  userId: string, 
  integrationId: string, 
  provider: string,
  maxMessages: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Inicio del día
  
  const limit = await this.findOneAndUpdate(
    {
      userId,
      integrationId,
      date: today,
    },
    {
      $inc: { messageCount: 1 },
      $setOnInsert: {
        userId,
        integrationId,
        provider,
        date: today,
        maxMessages,
        messageCount: 1,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
  
  return limit;
};

// Método para verificar si puede enviar más mensajes
MessageLimitSchema.methods.canSendMessage = function(): boolean {
  return this.messageCount < this.maxMessages;
};

// Método para obtener mensajes restantes
MessageLimitSchema.methods.getRemainingMessages = function(): number {
  return Math.max(0, this.maxMessages - this.messageCount);
};

export default mongoose.model<IMessageLimit>('MessageLimit', MessageLimitSchema);
