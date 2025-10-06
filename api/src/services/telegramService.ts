import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import logger from '../utils/logger';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  text?: string;
  date: number;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface SendDocumentResult {
  success: boolean;
  messageId?: number;
  fileId?: string;
  error?: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

/**
 * Servicio para manejar todas las operaciones con Telegram Bot API
 */
export class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || config.telegramBotToken || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Método privado para manejar errores de forma centralizada (DRY)
   */
  private handleError(methodName: string, error: unknown, context: Record<string, any> = {}): SendMessageResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorData = (error as any)?.response?.data?.description || errorMessage;

    logger.error(`Error en el servicio de Telegram (${methodName})`, {
      ...context,
      error: errorMessage,
      response: (error as any)?.response?.data
    });

    return {
      success: false,
      error: errorData
    };
  }

  /**
   * Verifica que el bot token sea válido
   */
  async verifyBotToken(): Promise<{ success: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.get(`${this.baseUrl}/getMe`);
      
      if (response.data.ok) {
        return {
          success: true,
          botInfo: response.data.result
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error desconocido'
        };
      }
    } catch (error: unknown) {
      const errorResult = this.handleError('verifyBotToken', error);
      return {
        success: false,
        error: errorResult.error
      };
    }
  }

  /**
   * Envía un mensaje de texto a un usuario de Telegram
   */
  async sendMessage(chatId: string, text: string, options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_to_message_id?: number;
    disable_web_page_preview?: boolean;
  }): Promise<SendMessageResult> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const payload: any = {
        chat_id: chatId,
        text: text,
        reply_to_message_id: options?.reply_to_message_id,
        disable_web_page_preview: options?.disable_web_page_preview || false
      };

      // Solo agregar parse_mode si se especifica explícitamente
      if (options?.parse_mode) {
        payload.parse_mode = options.parse_mode;
      }

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error enviando mensaje'
        };
      }
    } catch (error: unknown) {
      return this.handleError('sendMessage', error, { chatId });
    }
  }

  /**
   * Envía un documento (archivo) a un usuario de Telegram
   */
  async sendDocument(chatId: string, document: string | Buffer, options?: {
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_to_message_id?: number;
    filename?: string;
  }): Promise<SendDocumentResult> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const formData = new FormData();
      formData.append('chat_id', chatId);
      
      if (typeof document === 'string') {
        formData.append('document', document);
      } else {
        formData.append('document', document, options?.filename || 'document');
      }

      if (options?.caption) {
        formData.append('caption', options.caption);
      }
      
      if (options?.parse_mode) {
        formData.append('parse_mode', options.parse_mode);
      }
      
      if (options?.reply_to_message_id) {
        formData.append('reply_to_message_id', options.reply_to_message_id.toString());
      }

      const response = await axios.post(`${this.baseUrl}/sendDocument`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id,
          fileId: response.data.result.document?.file_id
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error enviando documento'
        };
      }
    } catch (error: unknown) {
      const errorResult = this.handleError('sendDocument', error, { chatId });
      return {
        success: false,
        error: errorResult.error
      };
    }
  }

  /**
   * Envía un mensaje con teclado personalizado
   */
  async sendMessageWithKeyboard(chatId: string, text: string, keyboard: {
    inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
  }): Promise<SendMessageResult> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        reply_markup: keyboard
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id.toString()
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error enviando mensaje con teclado'
        };
      }
    } catch (error: any) {
      logger.error('Error enviando mensaje con teclado de Telegram', {
        chatId,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Obtiene información de un usuario de Telegram
   */
  async getUserInfo(userId: string): Promise<{ success: boolean; user?: TelegramUser; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      // Telegram no tiene un endpoint directo para obtener info de usuario
      // Solo podemos obtener info cuando el usuario interactúa con el bot
      return {
        success: false,
        error: 'No se puede obtener información de usuario sin interacción previa'
      };
    } catch (error: any) {
      logger.error('Error obteniendo información de usuario de Telegram', {
        userId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configura el webhook del bot
   */
  async setWebhook(webhookUrl: string, secretToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post']
      });

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error configurando webhook'
        };
      }
    } catch (error: any) {
      logger.error('Error configurando webhook de Telegram', {
        webhookUrl,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Obtiene información del webhook actual
   */
  async getWebhookInfo(): Promise<{ success: boolean; webhookInfo?: any; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.get(`${this.baseUrl}/getWebhookInfo`);

      if (response.data.ok) {
        return {
          success: true,
          webhookInfo: response.data.result
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error obteniendo información del webhook'
        };
      }
    } catch (error: any) {
      logger.error('Error obteniendo información del webhook de Telegram', {
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Elimina el webhook del bot
   */
  async deleteWebhook(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error eliminando webhook'
        };
      }
    } catch (error: any) {
      logger.error('Error eliminando webhook de Telegram', {
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Procesa un update del webhook de Telegram
   */
  processWebhookUpdate(update: TelegramWebhookUpdate): {
    message?: TelegramMessage;
    chatId?: number;
    userId?: number;
    text?: string;
    messageId?: number;
  } {
    const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    
    if (!message) {
      return {};
    }

    return {
      message,
      chatId: message.chat.id,
      userId: message.from.id,
      text: message.text,
      messageId: message.message_id
    };
  }

  /**
   * Edita el texto de un mensaje enviado por el bot
   */
  async editMessageText(chatId: string, messageId: number, text: string, options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: any;
  }): Promise<SendMessageResult> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const payload: any = {
        chat_id: chatId,
        message_id: messageId,
        text: text
      };

      if (options?.parse_mode) {
        payload.parse_mode = options.parse_mode;
      }

      if (options?.reply_markup) {
        payload.reply_markup = options.reply_markup;
      }

      const response = await axios.post(`${this.baseUrl}/editMessageText`, payload);

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error editando mensaje'
        };
      }
    } catch (error: unknown) {
      return this.handleError('editMessageText', error, { chatId, messageId });
    }
  }

  /**
   * Responde a un callback query (botones inline)
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Bot token no configurado' };
      }

      const response = await axios.post(`${this.baseUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert || false
      });

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error respondiendo callback query'
        };
      }
    } catch (error: any) {
      logger.error('Error respondiendo callback query de Telegram', {
        callbackQueryId,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }
}

// Instancia singleton del servicio
export const telegramService = new TelegramService();

// Funciones de conveniencia
export const sendTelegramMessage = (chatId: string, text: string, options?: any) => 
  telegramService.sendMessage(chatId, text, options);

export const sendTelegramDocument = (chatId: string, document: string | Buffer, options?: any) => 
  telegramService.sendDocument(chatId, document, options);

export const sendTelegramMessageWithKeyboard = (chatId: string, text: string, keyboard: any) => 
  telegramService.sendMessageWithKeyboard(chatId, text, keyboard);

export const editTelegramMessage = (chatId: string, messageId: number, text: string, options?: any) => 
  telegramService.editMessageText(chatId, messageId, text, options);

export const verifyTelegramBot = () => telegramService.verifyBotToken();

export const setTelegramWebhook = (webhookUrl: string, secretToken?: string) => 
  telegramService.setWebhook(webhookUrl, secretToken);

export const getTelegramWebhookInfo = () => telegramService.getWebhookInfo();

export const deleteTelegramWebhook = () => telegramService.deleteWebhook();
