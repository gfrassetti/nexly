import { Api, TelegramApi } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { logger } from '../utils/logger';
import { TelegramSession } from '../models/TelegramSession';
import { Types } from 'mongoose';

export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  id: number;
  chatId: number;
  text?: string;
  date: Date;
  fromId?: number;
  isOutgoing: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface GetChatsResult {
  success: boolean;
  chats?: TelegramChat[];
  error?: string;
}

export interface GetMessagesResult {
  success: boolean;
  messages?: TelegramMessage[];
  error?: string;
}

export class TelegramMTProtoService {
  private api: TelegramApi | null = null;
  private sessionString: string | null = null;
  private userId: string | null = null;

  constructor() {
    // Configuración de la API de Telegram
    // Usamos las credenciales de la aplicación de Telegram
    this.api = new TelegramApi(
      new StringSession(''), // Se establecerá dinámicamente
      parseInt(process.env.TELEGRAM_API_ID || '0'),
      process.env.TELEGRAM_API_HASH || '',
      {
        connectionRetries: 5,
        timeout: 10000,
        retryDelay: 2000,
      }
    );
  }

  /**
   * Inicializar sesión con string de sesión existente
   */
  async initializeSession(sessionString: string, userId: string): Promise<boolean> {
    try {
      this.sessionString = sessionString;
      this.userId = userId;
      
      this.api = new TelegramApi(
        new StringSession(sessionString),
        parseInt(process.env.TELEGRAM_API_ID || '0'),
        process.env.TELEGRAM_API_HASH || '',
        {
          connectionRetries: 5,
          timeout: 10000,
          retryDelay: 2000,
        }
      );

      await this.api.start();
      return true;
    } catch (error: unknown) {
      logger.error('Error inicializando sesión de Telegram MTProto', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return false;
    }
  }

  /**
   * Iniciar proceso de autenticación con número de teléfono
   */
  async sendCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      const result = await this.api.sendCode(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
          apiHash: process.env.TELEGRAM_API_HASH || '',
        },
        phoneNumber
      );

      logger.info('Código de verificación enviado', { phoneNumber });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error enviando código de verificación', {
        error: errorMessage,
        phoneNumber
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verificar código de autenticación
   */
  async signIn(phoneNumber: string, code: string, password?: string): Promise<{
    success: boolean;
    sessionString?: string;
    userInfo?: TelegramUser;
    error?: string;
  }> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      let user;
      if (password) {
        // Si hay contraseña 2FA
        user = await this.api.signInUser({
          phoneNumber,
          phoneCode: code,
          password: password,
        });
      } else {
        // Autenticación normal
        user = await this.api.signInUser({
          phoneNumber,
          phoneCode: code,
        });
      }

      if (user) {
        // Obtener string de sesión
        const sessionString = this.api.session.save() as unknown as string;
        
        // Obtener información del usuario
        const userInfo: TelegramUser = {
          id: user.id.toJSNumber(),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phone || phoneNumber,
        };

        logger.info('Usuario autenticado exitosamente', {
          userId: userInfo.id,
          username: userInfo.username,
          phoneNumber
        });

        return {
          success: true,
          sessionString,
          userInfo
        };
      }

      return { success: false, error: 'No se pudo autenticar el usuario' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error en autenticación de Telegram', {
        error: errorMessage,
        phoneNumber
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtener información del usuario autenticado
   */
  async getMe(): Promise<{ success: boolean; user?: TelegramUser; error?: string }> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      const me = await this.api.getMe();
      
      const userInfo: TelegramUser = {
        id: me.id.toJSNumber(),
        username: me.username,
        firstName: me.firstName,
        lastName: me.lastName,
        phoneNumber: me.phone || '',
      };

      return { success: true, user: userInfo };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error obteniendo información del usuario', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtener lista de chats del usuario
   */
  async getChats(): Promise<GetChatsResult> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      const dialogs = await this.api.getDialogs();
      const chats: TelegramChat[] = [];

      for (const dialog of dialogs) {
        const entity = dialog.entity;
        if (entity) {
          chats.push({
            id: entity.id.toJSNumber(),
            type: entity.className === 'User' ? 'private' : 
                  entity.className === 'Chat' ? 'group' :
                  entity.className === 'Channel' ? (entity.megagroup ? 'supergroup' : 'channel') : 'private',
            title: 'title' in entity ? entity.title : 
                   'firstName' in entity ? entity.firstName : undefined,
            username: 'username' in entity ? entity.username : undefined,
          });
        }
      }

      return { success: true, chats };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error obteniendo chats', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtener mensajes de un chat específico
   */
  async getMessages(chatId: number, limit: number = 50): Promise<GetMessagesResult> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      const messages = await this.api.getMessages(chatId, {
        limit: limit,
      });

      const telegramMessages: TelegramMessage[] = messages.map(msg => ({
        id: msg.id,
        chatId: chatId,
        text: msg.message,
        date: new Date(msg.date * 1000),
        fromId: msg.fromId ? msg.fromId.toJSNumber() : undefined,
        isOutgoing: msg.out,
      }));

      return { success: true, messages: telegramMessages };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error obteniendo mensajes', { 
        error: errorMessage, 
        chatId 
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Enviar mensaje a un chat
   */
  async sendMessage(chatId: number, text: string): Promise<SendMessageResult> {
    try {
      if (!this.api) {
        throw new Error('API no inicializada');
      }

      const result = await this.api.sendMessage(chatId, {
        message: text,
      });

      return { 
        success: true, 
        messageId: result.id 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error enviando mensaje', { 
        error: errorMessage, 
        chatId 
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cerrar sesión y limpiar recursos
   */
  async disconnect(): Promise<void> {
    try {
      if (this.api) {
        await this.api.disconnect();
        this.api = null;
      }
      this.sessionString = null;
      this.userId = null;
    } catch (error: unknown) {
      logger.error('Error desconectando Telegram MTProto', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verificar si la sesión está activa
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.api) {
        return false;
      }
      await this.api.getMe();
      return true;
    } catch {
      return false;
    }
  }
}

// Instancia singleton del servicio
export const telegramMTProtoService = new TelegramMTProtoService();
