import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import logger from '../utils/logger';
import { TelegramSession } from '../models/TelegramSession';
import { Types } from 'mongoose';

// Función helper para extraer ID de objetos Peer de Telegram
function extractIdFromPeer(peer: any): number | undefined {
  try {
    // Si es un objeto PeerUser
    if (peer.userId) {
      return peer.userId.toJSNumber ? peer.userId.toJSNumber() : Number(peer.userId);
    }
    // Si es un objeto PeerChannel
    if (peer.channelId) {
      return peer.channelId.toJSNumber ? peer.channelId.toJSNumber() : Number(peer.channelId);
    }
    // Si es un objeto PeerChat
    if (peer.chatId) {
      return peer.chatId.toJSNumber ? peer.chatId.toJSNumber() : Number(peer.chatId);
    }
    // Si es un número directo
    if (typeof peer === 'number') {
      return peer;
    }
    // Si es un string, convertirlo a número
    if (typeof peer === 'string') {
      return Number(peer);
    }
    // Si tiene un método toString, usarlo
    if (peer && typeof peer.toString === 'function') {
      return Number(peer.toString());
    }
    return undefined;
  } catch (error) {
    logger.warn('Error extrayendo ID de peer:', { peer, error });
    return undefined;
  }
}

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
  lastMessage?: string;
  lastMessageTime?: string;
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
  private clients: Map<string, TelegramClient> = new Map(); // Caché de clientes por userId
  private sessions: Map<string, string> = new Map(); // Caché de sessionStrings por userId

  constructor() {
    // Constructor vacío, la inicialización se hace en initClient
  }

  private async initClient(userId: string, sessionString?: string): Promise<TelegramClient> {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    logger.info('Inicializando cliente de Telegram', { 
      userId,
      apiId: apiId || 'No configurado', 
      apiHash: apiHash ? 'Configurado' : 'No configurado',
      hasSessionString: !!sessionString
    });

    if (!apiId || !apiHash) {
      const error = `TELEGRAM_API_ID o TELEGRAM_API_HASH no están configurados. API_ID: ${apiId}, API_HASH: ${apiHash ? 'Configurado' : 'No configurado'}`;
      logger.error(error);
      throw new Error(error);
    }

    const stringSession = new StringSession(sessionString || '');
    
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
    });

    logger.info('Conectando cliente de Telegram...', { userId });
    await client.connect();
    logger.info('Cliente de Telegram conectado exitosamente', { userId });

    return client;
  }

  public async connect(userId: string, sessionString?: string): Promise<boolean> {
    try {
      // Verificar si ya existe un cliente en caché para este usuario
      if (this.clients.has(userId)) {
        const existingClient = this.clients.get(userId)!;
        if (existingClient.connected) {
          logger.info('Usando cliente existente en caché', { userId });
          return true;
        } else {
          logger.info('Cliente en caché desconectado, reconectando...', { userId });
          await existingClient.connect();
          return true;
        }
      }

      // Si no hay cliente en caché, crear uno nuevo
      logger.info('Creando nuevo cliente de Telegram', { userId, hasSessionString: !!sessionString });
      
      const client = await this.initClient(userId, sessionString);
      
      // Guardar en caché
      this.clients.set(userId, client);
      
      if (sessionString) {
        this.sessions.set(userId, sessionString);
        logger.info('Reconectando con sesión existente', { userId });
      } else {
        logger.info('Cliente de Telegram inicializado para nueva autenticación', { userId });
      }

      return true;
    } catch (error: unknown) {
      logger.error('Error conectando cliente de Telegram', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  public async sendCode(userId: string, phoneNumber: string): Promise<SendCodeResult> {
    try {
      const client = this.clients.get(userId);
      
      if (!client) {
        logger.error('Cliente de Telegram no inicializado en sendCode', { userId });
        return {
          success: false,
          error: 'Cliente de Telegram no inicializado. Llama a connect() primero.',
        };
      }

      logger.info('Iniciando sendCode', { userId, phoneNumber });

      // Usar el método de alto nivel de GramJS
      const result = await client.sendCode(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
          apiHash: process.env.TELEGRAM_API_HASH || '',
        },
        phoneNumber
      );

      logger.info('Código de verificación enviado exitosamente', { 
        userId,
        phoneNumber, 
        phoneCodeHash: result.phoneCodeHash,
        hasPhoneCodeHash: !!result.phoneCodeHash 
      });
      
      if (!result.phoneCodeHash) {
        logger.error('phoneCodeHash no recibido en sendCode', { userId, phoneNumber, result });
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
        userId,
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

  public async signIn(userId: string, phoneNumber: string, phoneCode: string, phoneCodeHash: string, password?: string): Promise<SignInResult> {
    try {
      const client = this.clients.get(userId);
      
      if (!client) {
        logger.error('Cliente de Telegram no inicializado en signIn', { userId });
        return {
          success: false,
          error: 'Cliente de Telegram no inicializado. Llama a connect() primero.',
        };
      }

      logger.info('Iniciando signIn', { userId, phoneNumber, hasPassword: !!password });

      // Usar el método de alto nivel de GramJS
      const result = await client.signInUser(
        {
          apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
          apiHash: process.env.TELEGRAM_API_HASH || '',
        },
        {
          phoneNumber: phoneNumber,
          phoneCode: async () => phoneCode,
          password: password ? async () => password : undefined,
          onError: async (err: any) => {
            logger.error('Error en autenticación de Telegram', { userId, error: err });
            throw err;
          },
        }
      );

      if (result) {
        const sessionString = client.session.save() as unknown as string;
        
        const userInfo: TelegramUser = {
          id: extractIdFromPeer(result.id) || 0,
          username: (result as any).username || undefined,
          firstName: (result as any).firstName || undefined,
          lastName: (result as any).lastName || undefined,
          phoneNumber: (result as any).phone || phoneNumber,
        };

        logger.info('Usuario de Telegram autenticado exitosamente', {
          userId,
          telegramUserId: userInfo.id,
          username: userInfo.username,
          phoneNumber: userInfo.phoneNumber,
        });

        // Guardar sessionString en caché
        this.sessions.set(userId, sessionString);
        
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
      logger.error('Error en autenticación de Telegram', { userId, phoneNumber, error: errorMessage });
      
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

  public async getChats(userId: string): Promise<GetChatsResult> {
    try {
      const client = this.clients.get(userId);
      
      if (!client || !client.connected) {
        logger.error('Cliente de Telegram no conectado en getChats', { userId });
        return {
          success: false,
          error: 'Cliente de Telegram no conectado',
        };
      }

      const dialogs = await client.getDialogs();
      const chats: TelegramChat[] = dialogs.map((dialog: any) => {
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

        // Obtener información del último mensaje
        const lastMessage = dialog.message;
        let lastMessageText = 'Último mensaje no disponible';
        let lastMessageTime = new Date().toISOString();

        if (lastMessage) {
          lastMessageText = lastMessage.message || 'Mensaje no disponible';
          lastMessageTime = new Date(lastMessage.date * 1000).toISOString();
        }

        return {
          id: extractIdFromPeer(dialog.id) || 0,
          type,
          title,
          username,
          accessHash: (entity as any).accessHash ? (entity as any).accessHash.toString() : undefined,
          lastMessage: lastMessageText,
          lastMessageTime: lastMessageTime,
        };
      });

      return {
        success: true,
        chats,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error obteniendo chats de Telegram', {
        userId,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async getMessages(userId: string, chatId: number, limit: number = 20): Promise<GetMessagesResult> {
    try {
      const client = this.clients.get(userId);
      
      if (!client || !client.connected) {
        logger.error('Cliente de Telegram no conectado en getMessages', { userId, chatId });
        return {
          success: false,
          error: 'Cliente de Telegram no conectado',
        };
      }

      const messages = await client.getMessages(chatId, {
        limit: limit,
      });

      const telegramMessages: TelegramMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        chatId: chatId,
        text: msg.message,
        date: new Date(msg.date * 1000),
        fromId: msg.fromId ? extractIdFromPeer(msg.fromId) : undefined,
        isOutgoing: msg.out,
      }));

      return {
        success: true,
        messages: telegramMessages,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error obteniendo mensajes de Telegram', {
        userId,
        chatId,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async sendMessage(userId: string, chatId: number, message: string): Promise<SendMessageResult> {
    try {
      const client = this.clients.get(userId);
      
      if (!client || !client.connected) {
        logger.error('Cliente de Telegram no conectado en sendMessage', { userId, chatId });
        return {
          success: false,
          error: 'Cliente de Telegram no conectado',
        };
      }

      const result = await client.sendMessage(chatId, { message });
      
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
        userId,
        chatId,
        message,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public async disconnect(userId: string): Promise<void> {
    try {
      const client = this.clients.get(userId);
      
      if (client && client.connected) {
        await client.disconnect();
        logger.info('Cliente de Telegram desconectado', { userId });
      }
      
      // Limpiar del caché
      this.clients.delete(userId);
      this.sessions.delete(userId);
      
      logger.info('Cliente y sesión eliminados del caché', { userId });
    } catch (error: unknown) {
      logger.error('Error desconectando cliente de Telegram', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  public getSessionString(userId: string): string | null {
    return this.sessions.get(userId) || null;
  }

  /**
   * Iniciar listener de mensajes en tiempo real para un usuario
   */
  public async startMessageListener(userId: string, onMessage: (message: any) => void): Promise<void> {
    try {
      const client = this.clients.get(userId);
      
      if (!client || !client.connected) {
        logger.error('Cliente no disponible para listener', { userId });
        return;
      }

      logger.info('Iniciando listener de mensajes', { userId });

      // Escuchar nuevos mensajes
      client.addEventHandler(async (update: any) => {
        try {
          if (update.className === 'UpdateNewMessage') {
            const message = update.message;
            
            logger.info('Nuevo mensaje recibido', { 
              userId, 
              messageId: message.id,
              chatId: extractIdFromPeer(message.chatId),
              fromId: extractIdFromPeer(message.fromId)
            });

            // Procesar el mensaje y llamar al callback
            const processedMessage = {
              id: message.id,
              chatId: extractIdFromPeer(message.chatId),
              text: message.message || '',
              date: new Date(message.date * 1000),
              fromId: extractIdFromPeer(message.fromId),
              isOutgoing: message.out,
              userId: userId
            };

            onMessage(processedMessage);
          }
        } catch (error) {
          logger.error('Error procesando mensaje en listener', { 
            userId, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
          });
        }
      }, new (await import('telegram/events')).NewMessage({}));

      logger.info('Listener de mensajes iniciado exitosamente', { userId });
    } catch (error) {
      logger.error('Error iniciando listener de mensajes', { 
        userId, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  }

  /**
   * Detener listener de mensajes para un usuario
   */
  public async stopMessageListener(userId: string): Promise<void> {
    try {
      const client = this.clients.get(userId);
      
      if (client && client.connected) {
        // Simplemente desconectar el cliente detendrá todos los listeners
        logger.info('Listener de mensajes detenido', { userId });
      }
    } catch (error) {
      logger.error('Error deteniendo listener de mensajes', { 
        userId, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  }
}

export const telegramMTProtoService = new TelegramMTProtoService();