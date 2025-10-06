import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { config } from '../config';
import { telegramMTProtoService } from '../services/telegramMTProtoService';
import { TelegramSession } from '../models/TelegramSession';
import { Integration } from '../models/Integration';
import { User } from '../models/User';
import { checkIntegrationLimits } from '../services/messageLimits';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

/**
 * POST /telegram/send-code
 * Enviar código de verificación al número de teléfono
 */
router.post('/send-code', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'phone_number_required',
        message: 'Número de teléfono requerido'
      });
    }

    // Verificar límites de integraciones
    const limitsCheck = await checkIntegrationLimits(userId);
    if (!limitsCheck.canConnect) {
      return res.status(403).json({
        success: false,
        error: 'integration_limit_exceeded',
        message: limitsCheck.reason,
        details: {
          maxIntegrations: limitsCheck.maxIntegrations,
          currentIntegrations: limitsCheck.currentIntegrations
        }
      });
    }

    // Verificar si ya tiene Telegram conectado
    const existingIntegration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: 'linked'
    });

    if (existingIntegration) {
      return res.status(409).json({
        success: false,
        error: 'telegram_already_connected',
        message: 'Telegram ya está conectado',
        details: { integrationId: existingIntegration._id }
      });
    }

    // Verificar configuración de Telegram
    if (!config.telegramApiId || !config.telegramApiHash) {
      return res.status(500).json({
        success: false,
        error: 'telegram_not_configured',
        message: 'Telegram no está configurado en el servidor'
      });
    }

    // Enviar código de verificación
    const result = await telegramMTProtoService.sendCode(phoneNumber);
    
    if (result.success) {
      // Crear o actualizar sesión pendiente
      await TelegramSession.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          userId: new Types.ObjectId(userId),
          phoneNumber,
          sessionString: '', // Se establecerá después de la autenticación
          authState: 'pending_code',
          isActive: true,
          lastActivity: new Date()
        },
        { upsert: true, new: true }
      );

      logger.info('Código de verificación enviado', { userId, phoneNumber });
      
      res.json({
        success: true,
        message: 'Código de verificación enviado',
        phoneNumber: phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3') // Ocultar parte del número
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'send_code_failed',
        message: result.error || 'Error enviando código de verificación'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error enviando código de Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      phoneNumber: req.body.phoneNumber
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /telegram/verify-code
 * Verificar código de autenticación
 */
router.post('/verify-code', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const { phoneNumber, code, password } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'phone_code_required',
        message: 'Número de teléfono y código requeridos'
      });
    }

    // Buscar sesión pendiente
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      phoneNumber,
      authState: 'pending_code'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'Sesión no encontrada. Por favor, solicita un nuevo código.'
      });
    }

    // Verificar código
    const authResult = await telegramMTProtoService.signIn(phoneNumber, code, password);
    
    if (authResult.success && authResult.sessionString && authResult.userInfo) {
      // Actualizar sesión con datos de autenticación
      await TelegramSession.findByIdAndUpdate(session._id, {
        sessionString: authResult.sessionString,
        authState: 'authenticated',
        userInfo: authResult.userInfo,
        lastActivity: new Date()
      });

      // Crear integración
      const integration = await Integration.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), provider: 'telegram' },
        {
          userId: new Types.ObjectId(userId),
          provider: 'telegram',
          externalId: authResult.userInfo.id.toString(),
          accessToken: authResult.sessionString,
          name: `Telegram - ${authResult.userInfo.firstName || authResult.userInfo.username || phoneNumber}`,
          status: 'linked',
          meta: {
            telegramUserId: authResult.userInfo.id,
            telegramUsername: authResult.userInfo.username,
            telegramFirstName: authResult.userInfo.firstName,
            telegramLastName: authResult.userInfo.lastName,
            telegramPhoneNumber: phoneNumber,
            sessionString: authResult.sessionString,
            isActive: true
          }
        },
        { upsert: true, new: true }
      );

      logger.info('Telegram conectado exitosamente', {
        userId,
        telegramUserId: authResult.userInfo.id,
        integrationId: integration._id
      });

      res.json({
        success: true,
        message: 'Telegram conectado exitosamente',
        integration: {
          id: integration._id,
          provider: 'telegram',
          name: integration.name,
          status: integration.status,
          userInfo: authResult.userInfo
        }
      });
    } else {
      // Actualizar estado de error
      await TelegramSession.findByIdAndUpdate(session._id, {
        authState: 'error'
      });

      res.status(400).json({
        success: false,
        error: 'verification_failed',
        message: authResult.error || 'Código de verificación inválido'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error verificando código de Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      phoneNumber: req.body.phoneNumber
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /telegram/chats
 * Obtener lista de chats del usuario
 */
router.get('/chats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    // Buscar integración de Telegram
    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: 'linked'
    });

    if (!integration || !integration.meta?.sessionString) {
      return res.status(404).json({
        success: false,
        error: 'telegram_not_connected',
        message: 'Telegram no está conectado'
      });
    }

    // Inicializar sesión
    const initialized = await telegramMTProtoService.initializeSession(
      integration.meta.sessionString,
      userId
    );

    if (!initialized) {
      return res.status(500).json({
        success: false,
        error: 'session_initialization_failed',
        message: 'Error inicializando sesión de Telegram'
      });
    }

    // Obtener chats
    const chatsResult = await telegramMTProtoService.getChats();
    
    if (chatsResult.success) {
      res.json({
        success: true,
        chats: chatsResult.chats
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'get_chats_failed',
        message: chatsResult.error || 'Error obteniendo chats'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error obteniendo chats de Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /telegram/messages/:chatId
 * Obtener mensajes de un chat específico
 */
router.get('/messages/:chatId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chat_id_required',
        message: 'ID del chat requerido'
      });
    }

    // Buscar integración de Telegram
    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: 'linked'
    });

    if (!integration || !integration.meta?.sessionString) {
      return res.status(404).json({
        success: false,
        error: 'telegram_not_connected',
        message: 'Telegram no está conectado'
      });
    }

    // Inicializar sesión
    const initialized = await telegramMTProtoService.initializeSession(
      integration.meta.sessionString,
      userId
    );

    if (!initialized) {
      return res.status(500).json({
        success: false,
        error: 'session_initialization_failed',
        message: 'Error inicializando sesión de Telegram'
      });
    }

    // Obtener mensajes
    const messagesResult = await telegramMTProtoService.getMessages(parseInt(chatId), limit);
    
    if (messagesResult.success) {
      res.json({
        success: true,
        messages: messagesResult.messages
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'get_messages_failed',
        message: messagesResult.error || 'Error obteniendo mensajes'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error obteniendo mensajes de Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      chatId: req.params.chatId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /telegram/send-message
 * Enviar mensaje a un chat
 */
router.post('/send-message', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const { chatId, message } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chat_message_required',
        message: 'ID del chat y mensaje requeridos'
      });
    }

    // Buscar integración de Telegram
    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: 'linked'
    });

    if (!integration || !integration.meta?.sessionString) {
      return res.status(404).json({
        success: false,
        error: 'telegram_not_connected',
        message: 'Telegram no está conectado'
      });
    }

    // Inicializar sesión
    const initialized = await telegramMTProtoService.initializeSession(
      integration.meta.sessionString,
      userId
    );

    if (!initialized) {
      return res.status(500).json({
        success: false,
        error: 'session_initialization_failed',
        message: 'Error inicializando sesión de Telegram'
      });
    }

    // Enviar mensaje
    const sendResult = await telegramMTProtoService.sendMessage(parseInt(chatId), message);
    
    if (sendResult.success) {
      res.json({
        success: true,
        messageId: sendResult.messageId,
        message: 'Mensaje enviado exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'send_message_failed',
        message: sendResult.error || 'Error enviando mensaje'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error enviando mensaje de Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      chatId: req.body.chatId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * DELETE /telegram/disconnect
 * Desconectar Telegram
 */
router.delete('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    // Buscar integración de Telegram
    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: 'linked'
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'telegram_not_connected',
        message: 'Telegram no está conectado'
      });
    }

    // Eliminar integración
    await Integration.findByIdAndDelete(integration._id);

    // Eliminar sesión
    await TelegramSession.findOneAndDelete({
      userId: new Types.ObjectId(userId)
    });

    // Desconectar servicio
    await telegramMTProtoService.disconnect();

    logger.info('Telegram desconectado exitosamente', { userId });

    res.json({
      success: true,
      message: 'Telegram desconectado exitosamente'
    });

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error desconectando Telegram', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

export default router;
