import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

export interface TelegramUser {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: string;
    type: string;
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
  messageId?: string;
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
    } catch (error: any) {
      logger.error('Error verificando bot token de Telegram', {
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

      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: options?.parse_mode || 'HTML',
        reply_to_message_id: options?.reply_to_message_id,
        disable_web_page_preview: options?.disable_web_page_preview || false
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id.toString()
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Error enviando mensaje'
        };
      }
    } catch (error: any) {
      logger.error('Error enviando mensaje de Telegram', {
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
    chatId?: string;
    userId?: string;
    text?: string;
    messageId?: number;
  } {
    const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    
    if (!message) {
      return {};
    }

    return {
      message,
      chatId: message.chat.id.toString(),
      userId: message.from.id.toString(),
      text: message.text,
      messageId: message.message_id
    };
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

export const sendTelegramMessageWithKeyboard = (chatId: string, text: string, keyboard: any) => 
  telegramService.sendMessageWithKeyboard(chatId, text, keyboard);

export const verifyTelegramBot = () => telegramService.verifyBotToken();

export const setTelegramWebhook = (webhookUrl: string, secretToken?: string) => 
  telegramService.setWebhook(webhookUrl, secretToken);

export const getTelegramWebhookInfo = () => telegramService.getWebhookInfo();

export const deleteTelegramWebhook = () => telegramService.deleteWebhook();
