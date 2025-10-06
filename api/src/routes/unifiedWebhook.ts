import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { unifiedMessagingService, IncomingMessage } from '../services/unifiedMessagingService';
import { Integration } from '../models/Integration';
import { Types } from 'mongoose';

const router = Router();

/**
 * POST /unified-webhook/whatsapp
 * Webhook para mensajes entrantes de WhatsApp
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { entry } = req.body;
    
    if (!entry || !Array.isArray(entry)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook data' });
    }

    for (const change of entry) {
      if (change.field === 'messages' && change.value) {
        const { messages, contacts, metadata } = change.value;
        
        if (messages && Array.isArray(messages)) {
          for (const message of messages) {
            // Buscar integración de WhatsApp para este número
            const integration = await Integration.findOne({
              provider: 'whatsapp',
              'meta.displayPhone': metadata?.display_phone_number,
              status: 'linked'
            });

            if (!integration) {
              logger.warn('WhatsApp integration not found for incoming message', {
                phoneNumber: metadata?.display_phone_number,
                messageId: message.id
              });
              continue;
            }

            // Procesar mensaje entrante
            const incomingMessage: IncomingMessage = {
              channel: 'whatsapp',
              externalMessageId: message.id,
              externalContactId: message.from,
              content: {
                text: message.text?.body,
                type: message.type === 'text' ? 'text' : 'other',
                mediaUrl: message.image?.id || message.video?.id || message.audio?.id,
                mediaType: message.type,
                fileName: message.document?.filename
              },
              participant: {
                name: contacts?.[0]?.profile?.name,
                phoneNumber: message.from
              },
              timestamp: new Date(parseInt(message.timestamp) * 1000),
              metadata: {
                phoneNumberId: metadata?.phone_number_id,
                displayPhoneNumber: metadata?.display_phone_number
              }
            };

            await unifiedMessagingService.processIncomingMessage(
              integration.userId.toString(),
              incomingMessage
            );
          }
        }
      }
    }

    res.json({ success: true, message: 'WhatsApp webhook processed' });

  } catch (error: unknown) {
    logger.error('Error processing WhatsApp webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'webhook_processing_failed',
      message: 'Error processing WhatsApp webhook'
    });
  }
});

/**
 * POST /unified-webhook/instagram
 * Webhook para mensajes entrantes de Instagram
 */
router.post('/instagram', async (req: Request, res: Response) => {
  try {
    const { entry } = req.body;
    
    if (!entry || !Array.isArray(entry)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook data' });
    }

    for (const change of entry) {
      if (change.field === 'messages' && change.value) {
        const { messages, contacts } = change.value;
        
        if (messages && Array.isArray(messages)) {
          for (const message of messages) {
            // Buscar integración de Instagram
            const integration = await Integration.findOne({
              provider: 'instagram',
              'meta.instagramUserId': message.from?.id,
              status: 'linked'
            });

            if (!integration) {
              logger.warn('Instagram integration not found for incoming message', {
                instagramUserId: message.from?.id,
                messageId: message.id
              });
              continue;
            }

            // Procesar mensaje entrante
            const incomingMessage: IncomingMessage = {
              channel: 'instagram',
              externalMessageId: message.id,
              externalContactId: message.from?.id,
              content: {
                text: message.text,
                type: message.type === 'text' ? 'text' : 'other',
                mediaUrl: message.attachments?.[0]?.image?.url,
                mediaType: message.type
              },
              participant: {
                name: contacts?.[0]?.name,
                username: message.from?.username
              },
              timestamp: new Date(parseInt(message.timestamp)),
              metadata: {
                instagramUserId: message.from?.id
              }
            };

            await unifiedMessagingService.processIncomingMessage(
              integration.userId.toString(),
              incomingMessage
            );
          }
        }
      }
    }

    res.json({ success: true, message: 'Instagram webhook processed' });

  } catch (error: unknown) {
    logger.error('Error processing Instagram webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'webhook_processing_failed',
      message: 'Error processing Instagram webhook'
    });
  }
});

/**
 * POST /unified-webhook/telegram
 * Webhook para mensajes entrantes de Telegram
 */
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Invalid webhook data' });
    }

    // Buscar integración de Telegram
    const integration = await Integration.findOne({
      provider: 'telegram',
      'meta.telegramUserId': message.from?.id,
      status: 'linked'
    });

    if (!integration) {
      logger.warn('Telegram integration not found for incoming message', {
        telegramUserId: message.from?.id,
        messageId: message.message_id
      });
      return res.json({ success: true, message: 'Telegram webhook processed' });
    }

    // Procesar mensaje entrante
    const incomingMessage: IncomingMessage = {
      channel: 'telegram',
      externalMessageId: message.message_id.toString(),
      externalContactId: message.chat?.id?.toString(),
      content: {
        text: message.text,
        type: message.text ? 'text' : 'other',
        mediaUrl: message.photo?.[0]?.file_id || message.video?.file_id || message.audio?.file_id,
        mediaType: message.photo ? 'image' : message.video ? 'video' : message.audio ? 'audio' : 'text'
      },
      participant: {
        name: message.from?.first_name + (message.from?.last_name ? ` ${message.from.last_name}` : ''),
        username: message.from?.username,
        phoneNumber: message.from?.phone_number
      },
      timestamp: new Date(message.date * 1000),
      metadata: {
        telegramUserId: message.from?.id,
        telegramChatId: message.chat?.id
      }
    };

    await unifiedMessagingService.processIncomingMessage(
      integration.userId.toString(),
      incomingMessage
    );

    res.json({ success: true, message: 'Telegram webhook processed' });

  } catch (error: unknown) {
    logger.error('Error processing Telegram webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'webhook_processing_failed',
      message: 'Error processing Telegram webhook'
    });
  }
});

/**
 * POST /unified-webhook/messenger
 * Webhook para mensajes entrantes de Facebook Messenger
 */
router.post('/messenger', async (req: Request, res: Response) => {
  try {
    const { entry } = req.body;
    
    if (!entry || !Array.isArray(entry)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook data' });
    }

    for (const change of entry) {
      if (change.field === 'messages' && change.value) {
        const { messages } = change.value;
        
        if (messages && Array.isArray(messages)) {
          for (const message of messages) {
            // Buscar integración de Messenger
            const integration = await Integration.findOne({
              provider: 'messenger',
              'meta.messengerPsid': message.sender?.id,
              status: 'linked'
            });

            if (!integration) {
              logger.warn('Messenger integration not found for incoming message', {
                messengerPsid: message.sender?.id,
                messageId: message.mid
              });
              continue;
            }

            // Procesar mensaje entrante
            const incomingMessage: IncomingMessage = {
              channel: 'messenger',
              externalMessageId: message.mid,
              externalContactId: message.sender?.id,
              content: {
                text: message.message?.text,
                type: message.message?.text ? 'text' : 'other',
                mediaUrl: message.message?.attachments?.[0]?.payload?.url,
                mediaType: message.message?.attachments?.[0]?.type
              },
              participant: {
                name: message.sender?.name
              },
              timestamp: new Date(message.timestamp),
              metadata: {
                messengerPsid: message.sender?.id
              }
            };

            await unifiedMessagingService.processIncomingMessage(
              integration.userId.toString(),
              incomingMessage
            );
          }
        }
      }
    }

    res.json({ success: true, message: 'Messenger webhook processed' });

  } catch (error: unknown) {
    logger.error('Error processing Messenger webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'webhook_processing_failed',
      message: 'Error processing Messenger webhook'
    });
  }
});

export default router;
