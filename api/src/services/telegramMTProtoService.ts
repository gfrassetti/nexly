import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import logger from '../utils/logger';
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
  accessHash?: string;
}

export interface TelegramMessage {
  id: number;
  chatId: number;
  text?: string;
  date: Date;
  fromId?: number;
  isOutgoing: boolean;
}

export interface SendCodeResult {
  success: boolean;
  phoneCodeHash?: string;
  error?: string;
}

export interface SignInResult {
  success: boolean;
  user?: TelegramUser;
  sessionString?: string;
  requiresPassword?: boolean;
  error?: string;
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
  private client: TelegramClient | null = null;
  private sessionString: string | null = null;
  private userId: string | null = null;

  constructor() {
    // Constructor vacío, la inicialización se hace en initClient
  }

  private async initClient(sessionString?: string): Promise<void> {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    logger.info('Inicializando cliente de Telegram', { 
      apiId: apiId || 'No configurado', 
      apiHash: apiHash ? 'Configurado' : 'No configurado' 
    });

    if (!apiId || !apiHash) {
      const error = `TELEGRAM_API_ID o TELEGRAM_API_HASH no están configurados. API_ID: ${apiId}, API_HASH: ${apiHash ? 'Configurado' : 'No configurado'}`;
      logger.error(error);
      throw new Error(error);
    }

    const stringSession = new StringSession(sessionString || '');
    
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
    });

    logger.info('Conectando cliente de Telegram...');
    await this.client.connect();
    logger.info('Cliente de Telegram conectado exitosamente');
  }

  public async connect(userId: string, sessionString?: string): Promise<boolean> {
    try {
      this.userId = userId;
      await this.initClient(sessionString);
      
      if (!this.client) {
        throw new Error('Cliente de Telegram no inicializado');
      }

      // Si hay sessionString, intentar reconectar
      if (sessionString) {
        logger.info('Reconectando con sesión existente', { userId });
        return true;
      }

      logger.info('Cliente de Telegram inicializado para nueva autenticación', { userId });
      return true;
    } catch (error: unknown) {
      logger.error('Error conectando cliente de Telegram', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  public async sendCode(phoneNumber: string): Promise<SendCodeResult> {
    try {
      if (!this.client) {
        logger.error('Cliente de Telegram no inicializado en sendCode');
        return {
          success: false,
          error: 'Cliente de Telegram no inicializado. Llama a connect() primero.',
        };
      }

      logger.info('Iniciando sendCode', { phoneNumber });

      // Usar el método de alto nivel de GramJS
      const result = await this.client.sendCode(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
          apiHash: process.env.TELEGRAM_API_HASH || '',
        },
        phoneNumber
      );

      logger.info('Código de verificación enviado exitosamente', { 
        phoneNumber, 
        phoneCodeHash: result.phoneCodeHash,
        hasPhoneCodeHash: !!result.phoneCodeHash 
      });
      
      if (!result.phoneCodeHash) {
        logger.error('phoneCodeHash no recibido en sendCode', { phoneNumber, result });
        return {
          success: false,
          error: 'No se recibió el hash de verificación de Telegram',
        };
      }

      return {
        success: true,
        phoneCodeHash: result.phoneCodeHash,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error enviando código de verificación', { 
        phoneNumber, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Verificar si es un error de flood
      if (errorMessage.includes('FLOOD') || errorMessage.includes('flood')) {
        return {
          success: false,
          error: 'FLOOD_WAIT: Demasiados intentos. Intenta más tarde.',
        };
      }

      // Verificar si es un error de número inválido
      if (errorMessage.includes('PHONE_NUMBER_INVALID')) {
        return {
          success: false,
          error: 'Número de teléfono inválido. Asegúrate de incluir el código de país.',
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async signIn(phoneNumber: string, phoneCode: string, phoneCodeHash: string, password?: string): Promise<SignInResult> {
    try {
      if (!this.client) {
        throw new Error('Cliente de Telegram no inicializado. Llama a connect() primero.');
      }

      // Usar el método de alto nivel de GramJS
      const result = await this.client.signInUser(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
          apiHash: process.env.TELEGRAM_API_HASH || '',
        },
        {
          phoneNumber: phoneNumber,
          phoneCode: async () => phoneCode,
          password: password ? async () => password : undefined,
          onError: async (err: any) => {
            logger.error('Error en autenticación de Telegram', { error: err });
            throw err;
          },
        }
      );

      if (result) {
        const sessionString = this.client.session.save() as unknown as string;
        
        const userInfo: TelegramUser = {
          id: result.id.toJSNumber(),
          username: (result as any).username || undefined,
          firstName: (result as any).firstName || undefined,
          lastName: (result as any).lastName || undefined,
          phoneNumber: (result as any).phone || phoneNumber,
        };

        logger.info('Usuario de Telegram autenticado exitosamente', {
          userId: userInfo.id,
          username: userInfo.username,
          phoneNumber: userInfo.phoneNumber,
        });

        this.sessionString = sessionString;
        
        return {
          success: true,
          user: userInfo,
          sessionString,
        };
      } else {
        return {
          success: false,
          error: 'No se pudo obtener información del usuario',
        };
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error en autenticación de Telegram', { phoneNumber, error: errorMessage });
      
      // Verificar si es error de 2FA
      if (errorMessage.includes('2FA') || errorMessage.includes('password') || errorMessage.includes('SESSION_PASSWORD_NEEDED')) {
        return {
          success: false,
          requiresPassword: true,
          error: 'Se requiere contraseña de autenticación de dos factores',
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async getChats(): Promise<GetChatsResult> {
    try {
      if (!this.client || !this.client.connected) {
        throw new Error('Cliente de Telegram no conectado');
      }

      const dialogs = await this.client.getDialogs();
      const chats: TelegramChat[] = dialogs.map(dialog => {
        const entity = dialog.entity;
        let type: 'private' | 'group' | 'supergroup' | 'channel' = 'private';
        let title: string | undefined;
        let username: string | undefined;
        let accessHash: string | undefined;

        if (entity instanceof Api.User) {
          type = 'private';
          title = entity.firstName || entity.lastName || 'Usuario';
          username = entity.username || undefined;
        } else if (entity instanceof Api.Chat) {
          type = 'group';
          title = entity.title;
        } else if (entity instanceof Api.Channel) {
          type = entity.megagroup ? 'supergroup' : 'channel';
          title = entity.title;
          username = entity.username || undefined;
        }

        return {
          id: dialog.id?.toJSNumber() || 0,
          type,
          title,
          username,
          accessHash: (entity as any).accessHash ? (entity as any).accessHash.toString() : undefined,
        };
      });

      return {
        success: true,
        chats,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error obteniendo chats de Telegram', {
        error: errorMessage,
        userId: this.userId,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async getMessages(chatId: number, limit: number = 20): Promise<GetMessagesResult> {
    try {
      if (!this.client || !this.client.connected) {
        throw new Error('Cliente de Telegram no conectado');
      }

      const messages = await this.client.getMessages(chatId, {
        limit: limit,
      });

      const telegramMessages: TelegramMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        chatId: chatId,
        text: msg.message,
        date: new Date(msg.date * 1000),
        fromId: msg.fromId ? msg.fromId.toJSNumber() : undefined,
        isOutgoing: msg.out,
      }));

      return {
        success: true,
        messages: telegramMessages,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error obteniendo mensajes de Telegram', {
        chatId,
        error: errorMessage,
        userId: this.userId,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async sendMessage(chatId: number, message: string): Promise<SendMessageResult> {
    try {
      if (!this.client || !this.client.connected) {
        throw new Error('Cliente de Telegram no conectado');
      }

      const result = await this.client.sendMessage(chatId, { message });
      
      if (result) {
        return {
          success: true,
          messageId: result.id,
        };
      } else {
        return {
          success: false,
          error: 'No se pudo enviar el mensaje',
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error enviando mensaje de Telegram', {
        chatId,
        message,
        error: errorMessage,
        userId: this.userId,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.client.connected) {
        await this.client.disconnect();
        logger.info('Cliente de Telegram desconectado', { userId: this.userId });
      }
      this.client = null;
      this.sessionString = null;
      this.userId = null;
    } catch (error: unknown) {
      logger.error('Error desconectando cliente de Telegram', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId: this.userId,
      });
    }
  }

  public getSessionString(): string | null {
    return this.sessionString;
  }
}

export const telegramMTProtoService = new TelegramMTProtoService();