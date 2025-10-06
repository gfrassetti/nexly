import logger from '../utils/logger';
import { UnifiedConversation, UnifiedConversationDoc } from '../models/UnifiedConversation';
import { UnifiedMessage, UnifiedMessageDoc } from '../models/UnifiedMessage';
import { Integration } from '../models/Integration';
import { Types } from 'mongoose';

export interface IncomingMessage {
  // Identificadores del canal
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
  externalMessageId: string;
  externalContactId: string;
  
  // Contenido del mensaje
  content: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'other';
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    contact?: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  
  // Información del participante
  participant: {
    name?: string;
    username?: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  
  // Timestamp del mensaje original
  timestamp: Date;
  
  // Metadatos específicos del canal
  metadata?: any;
}

export interface OutgoingMessage {
  conversationId: string;
  content: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'other';
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    contact?: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  replyTo?: {
    messageId: string;
    text?: string;
  };
}

export class UnifiedMessagingService {
  /**
   * Procesar mensaje entrante y crear/actualizar conversación unificada
   */
  async processIncomingMessage(
    userId: string,
    incomingMessage: IncomingMessage
  ): Promise<{ success: boolean; conversationId?: string; messageId?: string; error?: string }> {
    try {
      // 1. Buscar o crear conversación unificada
      const conversation = await this.findOrCreateConversation(userId, incomingMessage);
      
      if (!conversation) {
        throw new Error('No se pudo crear o encontrar la conversación');
      }

      // 2. Crear mensaje unificado
      const unifiedMessage = await this.createUnifiedMessage(conversation, incomingMessage);
      
      if (!unifiedMessage) {
        throw new Error('No se pudo crear el mensaje unificado');
      }

      // 3. Actualizar última actividad de la conversación
      await this.updateConversationActivity(conversation._id as Types.ObjectId, incomingMessage.timestamp, 'contact');

      logger.info('Mensaje entrante procesado exitosamente', {
        userId,
        conversationId: conversation.conversationId,
        messageId: unifiedMessage.messageId,
        channel: incomingMessage.channel
      });

      return {
        success: true,
        conversationId: conversation.conversationId,
        messageId: unifiedMessage.messageId
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error procesando mensaje entrante', {
        error: errorMessage,
        userId,
        channel: incomingMessage.channel,
        externalMessageId: incomingMessage.externalMessageId
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Enviar mensaje a través del canal apropiado
   */
  async sendMessage(
    userId: string,
    outgoingMessage: OutgoingMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 1. Buscar conversación
      const conversation = await UnifiedConversation.findOne({
        conversationId: outgoingMessage.conversationId,
        userId: new Types.ObjectId(userId)
      });

      if (!conversation) {
        throw new Error('Conversación no encontrada');
      }

      // 2. Enviar mensaje a través del canal apropiado
      const sendResult = await this.sendToChannel(conversation, outgoingMessage);
      
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Error enviando mensaje');
      }

      // 3. Crear mensaje unificado para el historial
      const unifiedMessage = await this.createOutgoingUnifiedMessage(
        conversation,
        outgoingMessage,
        sendResult.externalMessageId || 'unknown'
      );

      // 4. Actualizar última actividad
      await this.updateConversationActivity(conversation._id as Types.ObjectId, new Date(), 'user');

      logger.info('Mensaje enviado exitosamente', {
        userId,
        conversationId: conversation.conversationId,
        messageId: unifiedMessage?.messageId,
        channel: conversation.externalContact.channel
      });

      return {
        success: true,
        messageId: unifiedMessage?.messageId
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error enviando mensaje', {
        error: errorMessage,
        userId,
        conversationId: outgoingMessage.conversationId
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Obtener conversaciones unificadas del usuario
   */
  async getUserConversations(
    userId: string,
    options: {
      status?: 'active' | 'archived' | 'blocked';
      limit?: number;
      offset?: number;
      search?: string;
    } = {}
  ): Promise<{ success: boolean; conversations?: any[]; error?: string }> {
    try {
      const {
        status = 'active',
        limit = 50,
        offset = 0,
        search
      } = options;

      const query: any = {
        userId: new Types.ObjectId(userId),
        status
      };

      if (search) {
        query.$or = [
          { 'externalContact.name': { $regex: search, $options: 'i' } },
          { 'externalContact.username': { $regex: search, $options: 'i' } },
          { 'externalContact.phoneNumber': { $regex: search, $options: 'i' } }
        ];
      }

      const conversations = await UnifiedConversation.find(query)
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return {
        success: true,
        conversations
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error obteniendo conversaciones', {
        error: errorMessage,
        userId
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(
    userId: string,
    conversationId: string,
    options: {
      limit?: number;
      offset?: number;
      before?: Date;
    } = {}
  ): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const {
        limit = 50,
        offset = 0,
        before
      } = options;

      // Verificar que la conversación pertenece al usuario
      const conversation = await UnifiedConversation.findOne({
        conversationId,
        userId: new Types.ObjectId(userId)
      });

      if (!conversation) {
        throw new Error('Conversación no encontrada');
      }

      const query: any = {
        conversationId,
        userId: new Types.ObjectId(userId)
      };

      if (before) {
        query.createdAt = { $lt: before };
      }

      const messages = await UnifiedMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return {
        success: true,
        messages: messages.reverse() // Ordenar cronológicamente
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error obteniendo mensajes', {
        error: errorMessage,
        userId,
        conversationId
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Buscar o crear conversación unificada
   */
  private async findOrCreateConversation(
    userId: string,
    incomingMessage: IncomingMessage
  ): Promise<UnifiedConversationDoc | null> {
    try {
      // Buscar conversación existente
      let conversation = await UnifiedConversation.findOne({
        userId: new Types.ObjectId(userId),
        'externalContact.externalId': incomingMessage.externalContactId,
        'externalContact.channel': incomingMessage.channel
      });

      if (conversation) {
        return conversation;
      }

      // Crear nueva conversación
      conversation = new UnifiedConversation({
        userId: new Types.ObjectId(userId),
        externalContact: {
          externalId: incomingMessage.externalContactId,
          channel: incomingMessage.channel,
          name: incomingMessage.participant.name,
          username: incomingMessage.participant.username,
          phoneNumber: incomingMessage.participant.phoneNumber,
          profilePicture: incomingMessage.participant.profilePicture,
          metadata: this.buildContactMetadata(incomingMessage)
        },
        lastMessageAt: incomingMessage.timestamp,
        lastMessageFrom: 'contact',
        unreadCount: 1
      });

      await conversation.save();
      return conversation;

    } catch (error: unknown) {
      logger.error('Error creando/buscando conversación', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        channel: incomingMessage.channel,
        externalContactId: incomingMessage.externalContactId
      });
      return null;
    }
  }

  /**
   * Crear mensaje unificado entrante
   */
  private async createUnifiedMessage(
    conversation: UnifiedConversationDoc,
    incomingMessage: IncomingMessage
  ): Promise<UnifiedMessageDoc | null> {
    try {
      const unifiedMessage = new UnifiedMessage({
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        originalMessage: {
          externalMessageId: incomingMessage.externalMessageId,
          channel: incomingMessage.channel,
          originalTimestamp: incomingMessage.timestamp,
          metadata: incomingMessage.metadata
        },
        content: incomingMessage.content,
        direction: 'inbound',
        status: 'delivered',
        participant: {
          externalId: incomingMessage.externalContactId,
          name: incomingMessage.participant.name,
          type: 'contact'
        }
      });

      await unifiedMessage.save();
      return unifiedMessage;

    } catch (error: unknown) {
      logger.error('Error creando mensaje unificado', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversation.conversationId
      });
      return null;
    }
  }

  /**
   * Crear mensaje unificado saliente
   */
  private async createOutgoingUnifiedMessage(
    conversation: UnifiedConversationDoc,
    outgoingMessage: OutgoingMessage,
    externalMessageId: string
  ): Promise<UnifiedMessageDoc | null> {
    try {
      const unifiedMessage = new UnifiedMessage({
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        originalMessage: {
          externalMessageId,
          channel: conversation.externalContact.channel,
          originalTimestamp: new Date(),
          metadata: {}
        },
        content: outgoingMessage.content,
        direction: 'outbound',
        status: 'sent',
        participant: {
          externalId: conversation.externalContact.externalId,
          name: conversation.externalContact.name,
          type: 'user'
        },
        replyTo: outgoingMessage.replyTo
      });

      await unifiedMessage.save();
      return unifiedMessage;

    } catch (error: unknown) {
      logger.error('Error creando mensaje unificado saliente', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversation.conversationId
      });
      return null;
    }
  }

  /**
   * Enviar mensaje a través del canal apropiado
   */
  private async sendToChannel(
    conversation: UnifiedConversationDoc,
    outgoingMessage: OutgoingMessage
  ): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    try {
      const channel = conversation.externalContact.channel;
      
      // Aquí implementarías la lógica específica para cada canal
      // Por ahora, retornamos un resultado simulado
      switch (channel) {
        case 'whatsapp':
          return await this.sendWhatsAppMessage(conversation, outgoingMessage);
        case 'instagram':
          return await this.sendInstagramMessage(conversation, outgoingMessage);
        case 'messenger':
          return await this.sendMessengerMessage(conversation, outgoingMessage);
        case 'telegram':
          return await this.sendTelegramMessage(conversation, outgoingMessage);
        default:
          throw new Error(`Canal no soportado: ${channel}`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Actualizar actividad de la conversación
   */
  private async updateConversationActivity(
    conversationId: Types.ObjectId,
    timestamp: Date,
    lastMessageFrom: 'user' | 'contact'
  ): Promise<void> {
    try {
      await UnifiedConversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: timestamp,
        lastMessageFrom,
        $inc: lastMessageFrom === 'contact' ? { unreadCount: 1 } : { unreadCount: 0 }
      });
    } catch (error: unknown) {
      logger.error('Error actualizando actividad de conversación', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId
      });
    }
  }

  /**
   * Construir metadatos del contacto
   */
  private buildContactMetadata(incomingMessage: IncomingMessage): any {
    const metadata: any = {};
    
    switch (incomingMessage.channel) {
      case 'whatsapp':
        metadata.whatsappPhoneNumberId = incomingMessage.metadata?.phoneNumberId;
        break;
      case 'instagram':
        metadata.instagramUserId = incomingMessage.metadata?.userId;
        break;
      case 'telegram':
        metadata.telegramUserId = incomingMessage.metadata?.userId;
        metadata.telegramUsername = incomingMessage.participant.username;
        break;
      case 'messenger':
        metadata.messengerPsid = incomingMessage.metadata?.psid;
        break;
    }
    
    return metadata;
  }

  // Métodos específicos para cada canal (implementar según necesidad)
  private async sendWhatsAppMessage(conversation: UnifiedConversationDoc, message: OutgoingMessage): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    // Implementar envío a WhatsApp
    return { success: true, externalMessageId: 'whatsapp_msg_' + Date.now() };
  }

  private async sendInstagramMessage(conversation: UnifiedConversationDoc, message: OutgoingMessage): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    // Implementar envío a Instagram
    return { success: true, externalMessageId: 'instagram_msg_' + Date.now() };
  }

  private async sendMessengerMessage(conversation: UnifiedConversationDoc, message: OutgoingMessage): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    // Implementar envío a Messenger
    return { success: true, externalMessageId: 'messenger_msg_' + Date.now() };
  }

  private async sendTelegramMessage(conversation: UnifiedConversationDoc, message: OutgoingMessage): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    // Implementar envío a Telegram
    return { success: true, externalMessageId: 'telegram_msg_' + Date.now() };
  }
}

// Instancia singleton del servicio
export const unifiedMessagingService = new UnifiedMessagingService();
