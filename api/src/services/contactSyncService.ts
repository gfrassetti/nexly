// api/src/services/contactSyncService.ts
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { Contact } from '../models/Contact';
import { Integration } from '../models/Integration';
import { TelegramSession } from '../models/TelegramSession';
import { telegramMTProtoService } from './telegramMTProtoService';
import { Message } from '../models/Message';

type Provider = 'whatsapp' | 'telegram' | 'instagram' | 'messenger';

interface SyncResult {
  success: boolean;
  provider: Provider;
  contactsSynced: number;
  contactsUpdated: number;
  contactsCreated: number;
  error?: string;
}

interface ContactData {
  externalId: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  platformData?: any;
  lastInteraction?: Date;
  lastMessagePreview?: string;
}

/**
 * Servicio unificado para sincronizar contactos de todas las integraciones
 */
export class ContactSyncService {
  /**
   * Sincronizar contactos de todas las integraciones del usuario
   */
  async syncAllIntegrations(userId: string): Promise<SyncResult[]> {
    logger.info('Iniciando sincronización de contactos', { userId });

    const results: SyncResult[] = [];
    
    try {
      // Obtener todas las integraciones activas del usuario
      const integrations = await Integration.find({
        userId: new Types.ObjectId(userId),
        status: 'linked'
      });

      logger.info('Integraciones encontradas', { 
        userId, 
        count: integrations.length,
        providers: integrations.map(i => i.provider)
      });

      // Sincronizar cada integración
      for (const integration of integrations) {
        try {
          let result: SyncResult;
          
          switch (integration.provider) {
            case 'telegram':
              result = await this.syncTelegram(userId, integration);
              break;
            case 'whatsapp':
              result = await this.syncWhatsApp(userId, integration);
              break;
            case 'instagram':
              result = await this.syncInstagram(userId, integration);
              break;
            case 'messenger':
              result = await this.syncMessenger(userId, integration);
              break;
            default:
              result = {
                success: false,
                provider: integration.provider as Provider,
                contactsSynced: 0,
                contactsUpdated: 0,
                contactsCreated: 0,
                error: `Proveedor no soportado: ${integration.provider}`
              };
          }
          
          results.push(result);
        } catch (error) {
          logger.error('Error sincronizando integración', {
            userId,
            provider: integration.provider,
            integrationId: integration._id,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
          
          results.push({
            success: false,
            provider: integration.provider as Provider,
            contactsSynced: 0,
            contactsUpdated: 0,
            contactsCreated: 0,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      logger.info('Sincronización completada', { 
        userId, 
        results: results.map(r => ({ provider: r.provider, success: r.success, synced: r.contactsSynced }))
      });

      return results;
    } catch (error) {
      logger.error('Error en sincronización general', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Sincronizar contactos de una integración específica
   */
  async syncIntegration(userId: string, integrationId: string): Promise<SyncResult> {
    logger.info('Sincronizando integración específica', { userId, integrationId });

    const integration = await Integration.findOne({
      _id: new Types.ObjectId(integrationId),
      userId: new Types.ObjectId(userId),
      status: 'linked'
    });

    if (!integration) {
      return {
        success: false,
        provider: 'whatsapp', // default
        contactsSynced: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        error: 'Integración no encontrada o no activa'
      };
    }

    switch (integration.provider) {
      case 'telegram':
        return await this.syncTelegram(userId, integration);
      case 'whatsapp':
        return await this.syncWhatsApp(userId, integration);
      case 'instagram':
        return await this.syncInstagram(userId, integration);
      case 'messenger':
        return await this.syncMessenger(userId, integration);
      default:
        return {
          success: false,
          provider: integration.provider as Provider,
          contactsSynced: 0,
          contactsUpdated: 0,
          contactsCreated: 0,
          error: `Proveedor no soportado: ${integration.provider}`
        };
    }
  }

  /**
   * Sincronizar contactos de Telegram
   */
  private async syncTelegram(userId: string, integration: any): Promise<SyncResult> {
    logger.info('Sincronizando Telegram', { userId, integrationId: integration._id });

    try {
      // Buscar sesión activa
      const session = await TelegramSession.findOne({
        userId: new Types.ObjectId(userId),
        isActive: true,
        authState: 'authenticated'
      });

      if (!session || !session.sessionString) {
        return {
          success: false,
          provider: 'telegram',
          contactsSynced: 0,
          contactsUpdated: 0,
          contactsCreated: 0,
          error: 'No hay sesión activa de Telegram'
        };
      }

      // Conectar con Telegram
      const connected = await telegramMTProtoService.connect(userId, session.sessionString);
      if (!connected) {
        return {
          success: false,
          provider: 'telegram',
          contactsSynced: 0,
          contactsUpdated: 0,
          contactsCreated: 0,
          error: 'No se pudo conectar con Telegram'
        };
      }

      // Obtener chats
      const chatsResult = await telegramMTProtoService.getChats(userId);
      if (!chatsResult.success || !chatsResult.chats) {
        return {
          success: false,
          provider: 'telegram',
          contactsSynced: 0,
          contactsUpdated: 0,
          contactsCreated: 0,
          error: chatsResult.error || 'Error obteniendo chats'
        };
      }

      // Sincronizar cada chat como contacto
      let created = 0;
      let updated = 0;

      for (const chat of chatsResult.chats) {
        try {
          // Solo sincronizar chats privados (usuarios)
          if (chat.type !== 'private') {
            continue;
          }

          const contactData: ContactData = {
            externalId: chat.id.toString(),
            name: chat.title || chat.username || `Usuario ${chat.id}`,
            phone: chat.phone,
            avatar: chat.photo,
            platformData: {
              telegramUserId: chat.id,
              telegramUsername: chat.username,
              firstName: chat.firstName,
              lastName: chat.lastName
            },
            lastInteraction: chat.lastMessageDate ? new Date(chat.lastMessageDate * 1000) : undefined,
            lastMessagePreview: chat.lastMessage
          };

          const result = await this.upsertContact(
            userId,
            integration._id.toString(),
            'telegram',
            contactData
          );

          if (result === 'created') created++;
          else if (result === 'updated') updated++;

        } catch (error) {
          logger.error('Error sincronizando chat de Telegram', {
            userId,
            chatId: chat.id,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      logger.info('Sincronización de Telegram completada', { 
        userId, 
        created, 
        updated, 
        total: chatsResult.chats.length 
      });

      return {
        success: true,
        provider: 'telegram',
        contactsSynced: chatsResult.chats.length,
        contactsCreated: created,
        contactsUpdated: updated
      };

    } catch (error) {
      logger.error('Error en syncTelegram', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      return {
        success: false,
        provider: 'telegram',
        contactsSynced: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Sincronizar contactos de WhatsApp
   * En WhatsApp, los contactos se crean automáticamente cuando llegan mensajes
   * Esta función sincroniza los mensajes existentes para extraer contactos únicos
   */
  private async syncWhatsApp(userId: string, integration: any): Promise<SyncResult> {
    logger.info('Sincronizando WhatsApp', { userId, integrationId: integration._id });

    try {
      // Para WhatsApp, sincronizamos desde los mensajes existentes
      const messages = await Message.find({
        userId: new Types.ObjectId(userId),
        provider: 'whatsapp',
        integrationId: integration._id.toString()
      }).sort({ timestamp: -1 });

      // Agrupar por contacto único (from)
      const contactsMap = new Map<string, any>();

      for (const msg of messages) {
        if (!msg.from) continue;

        if (!contactsMap.has(msg.from)) {
          contactsMap.set(msg.from, {
            externalId: msg.from,
            lastMessage: msg,
            messages: [msg]
          });
        } else {
          contactsMap.get(msg.from)!.messages.push(msg);
        }
      }

      let created = 0;
      let updated = 0;

      for (const [externalId, data] of contactsMap.entries()) {
        try {
          const lastMsg: any = data.lastMessage;
          
          const contactData: ContactData = {
            externalId: externalId,
            name: lastMsg.senderName || lastMsg.from || 'Usuario de WhatsApp',
            phone: lastMsg.from,
            platformData: {
              waId: lastMsg.from,
              profileName: lastMsg.senderName
            },
            lastInteraction: lastMsg.timestamp,
            lastMessagePreview: lastMsg.body?.substring(0, 100)
          };

          const result = await this.upsertContact(
            userId,
            integration._id.toString(),
            'whatsapp',
            contactData
          );

          if (result === 'created') created++;
          else if (result === 'updated') updated++;

        } catch (error) {
          logger.error('Error sincronizando contacto de WhatsApp', {
            userId,
            externalId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      logger.info('Sincronización de WhatsApp completada', { 
        userId, 
        created, 
        updated, 
        total: contactsMap.size 
      });

      return {
        success: true,
        provider: 'whatsapp',
        contactsSynced: contactsMap.size,
        contactsCreated: created,
        contactsUpdated: updated
      };

    } catch (error) {
      logger.error('Error en syncWhatsApp', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      return {
        success: false,
        provider: 'whatsapp',
        contactsSynced: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Sincronizar contactos de Instagram
   */
  private async syncInstagram(userId: string, integration: any): Promise<SyncResult> {
    logger.info('Sincronizando Instagram', { userId, integrationId: integration._id });

    try {
      // Similar a WhatsApp, sincronizamos desde mensajes existentes
      const messages = await Message.find({
        userId: new Types.ObjectId(userId),
        provider: 'instagram',
        integrationId: integration._id.toString()
      }).sort({ timestamp: -1 });

      const contactsMap = new Map<string, any>();

      for (const msg of messages) {
        const msgData: any = msg;
        if (!msgData.from) continue;

        if (!contactsMap.has(msgData.from)) {
          contactsMap.set(msgData.from, {
            externalId: msgData.from,
            lastMessage: msg,
            messages: [msg]
          });
        } else {
          contactsMap.get(msgData.from)!.messages.push(msg);
        }
      }

      let created = 0;
      let updated = 0;

      for (const [externalId, data] of contactsMap.entries()) {
        try {
          const lastMsg: any = data.lastMessage;
          
          const contactData: ContactData = {
            externalId: externalId,
            name: lastMsg.senderName || 'Usuario de Instagram',
            platformData: {
              igId: lastMsg.from
            },
            lastInteraction: lastMsg.timestamp,
            lastMessagePreview: lastMsg.body?.substring(0, 100)
          };

          const result = await this.upsertContact(
            userId,
            integration._id.toString(),
            'instagram',
            contactData
          );

          if (result === 'created') created++;
          else if (result === 'updated') updated++;

        } catch (error) {
          logger.error('Error sincronizando contacto de Instagram', {
            userId,
            externalId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      logger.info('Sincronización de Instagram completada', { 
        userId, 
        created, 
        updated, 
        total: contactsMap.size 
      });

      return {
        success: true,
        provider: 'instagram',
        contactsSynced: contactsMap.size,
        contactsCreated: created,
        contactsUpdated: updated
      };

    } catch (error) {
      logger.error('Error en syncInstagram', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      return {
        success: false,
        provider: 'instagram',
        contactsSynced: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Sincronizar contactos de Messenger
   */
  private async syncMessenger(userId: string, integration: any): Promise<SyncResult> {
    logger.info('Sincronizando Messenger', { userId, integrationId: integration._id });

    try {
      // Similar a WhatsApp e Instagram
      const messages = await Message.find({
        userId: new Types.ObjectId(userId),
        provider: 'messenger',
        integrationId: integration._id.toString()
      }).sort({ timestamp: -1 });

      const contactsMap = new Map<string, any>();

      for (const msg of messages) {
        const msgData: any = msg;
        if (!msgData.from) continue;

        if (!contactsMap.has(msgData.from)) {
          contactsMap.set(msgData.from, {
            externalId: msgData.from,
            lastMessage: msg,
            messages: [msg]
          });
        } else {
          contactsMap.get(msgData.from)!.messages.push(msg);
        }
      }

      let created = 0;
      let updated = 0;

      for (const [externalId, data] of contactsMap.entries()) {
        try {
          const lastMsg: any = data.lastMessage;
          
          const contactData: ContactData = {
            externalId: externalId,
            name: lastMsg.senderName || 'Usuario de Messenger',
            platformData: {
              pageId: lastMsg.from
            },
            lastInteraction: lastMsg.timestamp,
            lastMessagePreview: lastMsg.body?.substring(0, 100)
          };

          const result = await this.upsertContact(
            userId,
            integration._id.toString(),
            'messenger',
            contactData
          );

          if (result === 'created') created++;
          else if (result === 'updated') updated++;

        } catch (error) {
          logger.error('Error sincronizando contacto de Messenger', {
            userId,
            externalId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      logger.info('Sincronización de Messenger completada', { 
        userId, 
        created, 
        updated, 
        total: contactsMap.size 
      });

      return {
        success: true,
        provider: 'messenger',
        contactsSynced: contactsMap.size,
        contactsCreated: created,
        contactsUpdated: updated
      };

    } catch (error) {
      logger.error('Error en syncMessenger', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      return {
        success: false,
        provider: 'messenger',
        contactsSynced: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Crear o actualizar un contacto en la base de datos
   */
  private async upsertContact(
    userId: string,
    integrationId: string,
    provider: Provider,
    contactData: ContactData
  ): Promise<'created' | 'updated'> {
    const existing = await Contact.findOne({
      userId: new Types.ObjectId(userId),
      externalId: contactData.externalId,
      provider: provider
    });

    if (existing) {
      // Actualizar contacto existente
      await Contact.findByIdAndUpdate(existing._id, {
        name: contactData.name || existing.name,
        phone: contactData.phone || existing.phone,
        email: contactData.email || existing.email,
        avatar: contactData.avatar || existing.avatar,
        profilePicture: contactData.avatar || existing.profilePicture,
        platformData: { ...existing.platformData, ...contactData.platformData },
        lastInteraction: contactData.lastInteraction || existing.lastInteraction,
        lastMessagePreview: contactData.lastMessagePreview || existing.lastMessagePreview,
        integrationId: integrationId
      });

      return 'updated';
    } else {
      // Crear nuevo contacto
      await Contact.create({
        userId: new Types.ObjectId(userId),
        integrationId: integrationId,
        provider: provider,
        externalId: contactData.externalId,
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        avatar: contactData.avatar,
        profilePicture: contactData.avatar,
        platformData: contactData.platformData,
        lastInteraction: contactData.lastInteraction,
        lastMessagePreview: contactData.lastMessagePreview,
        status: 'active'
      });

      return 'created';
    }
  }
}

// Instancia singleton
export const contactSyncService = new ContactSyncService();

