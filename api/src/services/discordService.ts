import axios from "axios";
import { Integration } from "../models/Integration";
import { Message } from "../models/Message";
import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import logger from "../utils/logger";
import { Types } from "mongoose";

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  type: number;
  guild_id?: string;
}

interface DiscordWebhookPayload {
  type: number;
  data?: DiscordMessage;
  channel_id?: string;
  encrypted_content?: string;
}

export class DiscordService {
  /**
   * Procesa un mensaje recibido de Discord
   */
  static async processIncomingMessage(
    payload: DiscordWebhookPayload,
    integration: any
  ): Promise<boolean> {
    try {
      // Discord envía un ping inicial para verificar el webhook
      if (payload.type === 1) { // PING
        return true;
      }

      // Procesar mensajes de Discord
      if (payload.type === 0 && payload.data) { // MESSAGE_CREATE
        await this.saveMessage(payload.data, integration);
        return true;
      }

      logger.info("Mensaje de Discord procesado", {
        messageId: payload.data?.id,
        channelId: payload.data?.channel_id,
        authorId: payload.data?.author?.id,
        content: payload.data?.content
      });

      return true;
    } catch (error: any) {
      logger.error("Error al procesar mensaje de Discord", {
        error: error.message,
        payload
      });
      return false;
    }
  }

  /**
   * Guarda un mensaje de Discord en la base de datos
   */
  private static async saveMessage(
    discordMessage: DiscordMessage,
    integration: any
  ): Promise<void> {
    try {
      const userId = integration.userId;
      const provider = "discord";

      // Crear o encontrar el contacto
      const contact = await this.createOrUpdateContact(discordMessage, userId);

      // Crear o encontrar la conversación
      const conversation = await this.createOrUpdateConversation(
        discordMessage,
        contact._id,
        userId
      );

      // Crear el mensaje
      const message = new Message({
        userId: new Types.ObjectId(userId),
        contactId: contact._id,
        integrationId: integration._id,
        conversationId: conversation._id,
        direction: "in",
        body: discordMessage.content,
        provider,
        externalMessageId: discordMessage.id,
        from: discordMessage.author.id,
        senderName: `${discordMessage.author.username}#${discordMessage.author.discriminator}`,
        timestamp: new Date(discordMessage.timestamp),
        isRead: false
      });

      await message.save();

      logger.info("Mensaje de Discord guardado exitosamente", {
        messageId: message._id,
        contactId: contact._id,
        conversationId: conversation._id,
        authorId: discordMessage.author.id
      });

    } catch (error: any) {
      logger.error("Error al guardar mensaje de Discord", {
        error: error.message,
        discordMessage
      });
      throw error;
    }
  }

  /**
   * Crea o actualiza un contacto de Discord
   */
  private static async createOrUpdateContact(
    discordMessage: DiscordMessage,
    userId: string
  ): Promise<any> {
    const contactData = {
      userId: new Types.ObjectId(userId),
      name: `${discordMessage.author.username}#${discordMessage.author.discriminator}`,
      provider: "discord",
      externalId: discordMessage.author.id,
      avatar: discordMessage.author.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordMessage.author.id}/${discordMessage.author.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordMessage.author.discriminator) % 5}.png`
    };

    return await Contact.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId),
        provider: "discord",
        externalId: discordMessage.author.id
      },
      contactData,
      { upsert: true, new: true }
    );
  }

  /**
   * Crea o actualiza una conversación de Discord
   */
  private static async createOrUpdateConversation(
    discordMessage: DiscordMessage,
    contactId: string,
    userId: string
  ): Promise<any> {
    const conversationData = {
      userId: new Types.ObjectId(userId),
      contactId: new Types.ObjectId(contactId),
      provider: "discord",
      externalId: discordMessage.channel_id,
      title: `Discord - ${discordMessage.channel_id}`,
      lastMessageAt: new Date(discordMessage.timestamp)
    };

    return await Conversation.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId),
        provider: "discord",
        externalId: discordMessage.channel_id
      },
      conversationData,
      { upsert: true, new: true }
    );
  }

  /**
   * Envía un mensaje directo a través de Discord
   */
  static async sendMessage(
    integration: any,
    channelId: string,
    content: string
  ): Promise<boolean> {
    try {
      const accessToken = integration.accessToken;
      if (!accessToken) {
        throw new Error("Token de acceso de Discord no encontrado");
      }

      const response = await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          content: content
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          timeout: 10000
        }
      );

      if (response.status === 200 || response.status === 201) {
        logger.info("Mensaje enviado exitosamente a Discord", {
          channelId,
          messageId: response.data.id,
          integrationId: integration._id
        });

        // Guardar el mensaje enviado en la base de datos
        await this.saveOutgoingMessage(
          response.data,
          integration,
          channelId,
          content
        );

        return true;
      }

      return false;
    } catch (error: any) {
      logger.error("Error al enviar mensaje a Discord", {
        error: error.message,
        channelId,
        integrationId: integration._id
      });
      return false;
    }
  }

  /**
   * Guarda un mensaje saliente de Discord
   */
  private static async saveOutgoingMessage(
    discordResponse: any,
    integration: any,
    channelId: string,
    content: string
  ): Promise<void> {
    try {
      const userId = integration.userId;
      const provider = "discord";

      // Buscar la conversación existente
      const conversation = await Conversation.findOne({
        userId: new Types.ObjectId(userId),
        provider: "discord",
        externalId: channelId
      });

      if (!conversation) {
        logger.warn("Conversación de Discord no encontrada para mensaje saliente", {
          channelId,
          integrationId: integration._id
        });
        return;
      }

      // Crear el mensaje saliente
      const message = new Message({
        userId: new Types.ObjectId(userId),
        contactId: conversation.contactId,
        integrationId: integration._id,
        conversationId: conversation._id,
        direction: "out",
        body: content,
        provider,
        externalMessageId: discordResponse.id,
        from: "bot",
        senderName: "Bot",
        timestamp: new Date(),
        isRead: true
      });

      await message.save();

      // Actualizar la conversación con el último mensaje
      await Conversation.updateOne(
        { _id: conversation._id },
        { 
          lastMessageAt: new Date(),
          lastMessage: content
        }
      );

      logger.info("Mensaje saliente de Discord guardado exitosamente", {
        messageId: message._id,
        conversationId: conversation._id,
        channelId
      });

    } catch (error: any) {
      logger.error("Error al guardar mensaje saliente de Discord", {
        error: error.message,
        channelId,
        integrationId: integration._id
      });
      throw error;
    }
  }

  /**
   * Obtiene información del usuario de Discord
   */
  static async getUserInfo(integration: any): Promise<any> {
    try {
      const accessToken = integration.accessToken;

      if (!accessToken) {
        throw new Error("Token de acceso de Discord no encontrado");
      }

      const response = await axios.get(
        `https://discord.com/api/users/@me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Error al obtener información del usuario de Discord", {
        error: error.message,
        integrationId: integration._id
      });
      throw error;
    }
  }

  /**
   * Obtiene canales de mensajes directos
   */
  static async getDirectMessageChannels(integration: any): Promise<any[]> {
    try {
      const accessToken = integration.accessToken;

      if (!accessToken) {
        throw new Error("Token de acceso de Discord no encontrado");
      }

      const response = await axios.get(
        `https://discord.com/api/users/@me/channels`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Error al obtener canales de mensajes directos", {
        error: error.message,
        integrationId: integration._id
      });
      throw error;
    }
  }
}
