import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { telegramMTProtoService } from '../services/telegramMTProtoService';
import { TelegramSession } from '../models/TelegramSession';
import { Integration } from '../models/Integration';
import { Message } from '../models/Message';
import { checkIntegrationLimits } from '../services/messageLimits';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

/**
 * GET /telegram/health
 * Verificar que el servicio de Telegram está configurado correctamente
 */
router.get('/health', async (req: AuthRequest, res: Response) => {
  try {
    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;

    const isConfigured = !!(apiId && apiHash && apiId !== '0');

    res.status(200).json({
      success: true,
      configured: isConfigured,
      apiId: apiId ? 'SET' : 'NOT_SET',
      apiHash: apiHash ? 'SET' : 'NOT_SET'
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

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

    // Verificar si ya existe una sesión (activa o no) para este usuario
    let existingSession = await TelegramSession.findOne({ 
      userId: new Types.ObjectId(userId)
    });

    if (existingSession) {
      // Si existe una sesión activa y autenticada, intentar reconectar
      if (existingSession.isActive && existingSession.authState === 'authenticated' && existingSession.sessionString) {
        const connected = await telegramMTProtoService.connect(userId, existingSession.sessionString);
        if (connected) {
          return res.status(200).json({
            success: true,
            message: 'Sesión existente reconectada',
            requiresCode: false,
            requiresPassword: false
          });
        }
      }
      
      // Si la sesión existe pero no está activa o no se pudo reconectar, marcar como inactiva
      existingSession.isActive = false;
      existingSession.authState = 'error';
      await existingSession.save();
    }

    // Inicializar cliente para nueva autenticación
    logger.info('Iniciando conexión con Telegram', { userId, phoneNumber });
    
    let connected;
    try {
      connected = await telegramMTProtoService.connect(userId);
      logger.info('Resultado de connect()', { userId, phoneNumber, connected });
    } catch (connectError) {
      logger.error('Error en connect() de Telegram', { 
        userId, 
        phoneNumber, 
        error: connectError instanceof Error ? connectError.message : 'Error desconocido',
        stack: connectError instanceof Error ? connectError.stack : undefined
      });
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: connectError instanceof Error ? connectError.message : 'Error conectando con Telegram'
      });
    }
    
    if (!connected) {
      logger.error('Error conectando con Telegram - connect() retornó false', { userId, phoneNumber });
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Enviar código de verificación
    const result = await telegramMTProtoService.sendCode(userId, phoneNumber.trim());
    
    if (!result.success) {
      logger.error('Error en sendCode', { userId, phoneNumber, error: result.error });
      return res.status(400).json({
        success: false,
        error: 'send_code_failed',
        message: result.error || 'Error enviando código de verificación'
      });
    }

    if (!result.phoneCodeHash) {
      logger.error('phoneCodeHash no recibido', { userId, phoneNumber });
      return res.status(500).json({
        success: false,
        error: 'invalid_response',
        message: 'No se recibió el hash de verificación'
      });
    }

    // Crear o actualizar sesión con phoneCodeHash
    const sessionData = {
      userId: new Types.ObjectId(userId),
      phoneNumber: phoneNumber.trim(),
      phoneCodeHash: result.phoneCodeHash,
      authState: 'pending_code' as const,
      isActive: false,
    };

    logger.info('Guardando sesión', { userId, phoneNumber, hasExistingSession: !!existingSession });

    if (existingSession) {
      await TelegramSession.findByIdAndUpdate(existingSession._id, sessionData);
    } else {
      await TelegramSession.create(sessionData);
    }

    logger.info('Código de verificación enviado exitosamente', { userId, phoneNumber });

    // Enmascarar el número de teléfono para mostrar en el frontend
    let maskedPhone = phoneNumber.trim();
    try {
      // Intentar enmascarar el número (funciona mejor con formato internacional)
      if (maskedPhone.length >= 10) {
        const digits = maskedPhone.replace(/\D/g, ''); // Quitar todo excepto dígitos
        if (digits.length >= 10) {
          maskedPhone = `${maskedPhone.substring(0, 3)}***${maskedPhone.substring(maskedPhone.length - 4)}`;
        }
      }
    } catch (maskError) {
      logger.warn('Error enmascarando número', { error: maskError });
      // Si falla el enmascaramiento, usar el número original
    }

    res.status(200).json({
      success: true,
      message: 'Código de verificación enviado',
      phoneNumber: maskedPhone,
      requiresCode: true,
      requiresPassword: false
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/send-code', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error instanceof Error ? `Error interno del servidor: ${error.message}` : 'Error interno del servidor desconocido'
    });
  }
});

/**
 * POST /telegram/verify-code
 * Verificar código de verificación y completar autenticación
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
        error: 'missing_parameters',
        message: 'Número de teléfono y código son requeridos'
      });
    }

    // Buscar sesión pendiente
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      phoneNumber: phoneNumber.trim(),
      authState: 'pending_code',
      isActive: false
    });

    if (!session || !session.phoneCodeHash) {
      return res.status(400).json({
        success: false,
        error: 'session_not_found',
        message: 'Sesión no encontrada o expirada. Inicia el proceso nuevamente.'
      });
    }

    // Conectar con el cliente
    const connected = await telegramMTProtoService.connect(userId);
    if (!connected) {
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Verificar código y autenticar
    const result = await telegramMTProtoService.signIn(
      userId,
      phoneNumber.trim(),
      code.trim(),
      session.phoneCodeHash,
      password
    );

    if (!result.success) {
      logger.error('Error en signIn', { 
        userId, 
        error: result.error,
        requiresPassword: result.requiresPassword
      });
      
      if (result.requiresPassword) {
        // Actualizar sesión para requerir contraseña
        session.authState = 'pending_password';
        await session.save();

        return res.status(200).json({
          success: false,
          error: 'verification_failed',
          message: 'Se requiere contraseña de autenticación de dos factores',
          requiresPassword: true
        });
      }

      return res.status(400).json({
        success: false,
        error: 'verification_failed',
        message: result.error || 'Código de verificación inválido'
      });
    }

    if (!result.user || !result.sessionString) {
      return res.status(500).json({
        success: false,
        error: 'authentication_incomplete',
        message: 'Error en el proceso de autenticación'
      });
    }

    // Actualizar sesión con datos del usuario
    session.sessionString = result.sessionString;
    session.phoneCodeHash = undefined;
    session.authState = 'authenticated';
    session.isActive = true;
    session.userInfo = {
      id: result.user.id,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phoneNumber: result.user.phoneNumber,
    };
    session.lastActivity = new Date();
    await session.save();

    // Crear o actualizar integración
    const integration = await Integration.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram',
        externalId: result.user.id.toString()
      },
      {
        name: result.user.username || result.user.firstName || `Telegram User ${result.user.id}`,
        status: 'linked',
        meta: {
          telegramUserId: result.user.id,
          telegramUsername: result.user.username,
          telegramFirstName: result.user.firstName,
          telegramLastName: result.user.lastName,
          telegramPhoneNumber: result.user.phoneNumber,
          sessionString: result.sessionString,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    // Iniciar listener de mensajes en tiempo real
    try {
      await telegramMTProtoService.startMessageListener(userId, async (message) => {
        logger.info('Mensaje recibido en tiempo real', { 
          userId, 
          messageId: message.id,
          chatId: message.chatId 
        });
        
        // Aquí podrías guardar el mensaje en la base de datos
        // o enviarlo via WebSocket al frontend
        // TODO: Implementar guardado en DB y notificación al frontend
      });
    } catch (listenerError) {
      logger.error('Error iniciando listener de mensajes', { 
        userId, 
        error: listenerError instanceof Error ? listenerError.message : 'Error desconocido' 
      });
      // No fallar la autenticación por esto
    }

    res.status(200).json({
      success: true,
      message: 'Telegram conectado exitosamente',
      user: result.user,
      integrationId: integration._id
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/verify-code', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /telegram/verify-password
 * Verificar contraseña de 2FA
 */
router.post('/verify-password', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        error: 'missing_parameters',
        message: 'Número de teléfono y contraseña son requeridos'
      });
    }

    // Buscar sesión pendiente de contraseña
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      phoneNumber: phoneNumber.trim(),
      authState: 'pending_password',
      isActive: false
    });

    if (!session || !session.phoneCodeHash) {
      return res.status(400).json({
        success: false,
        error: 'session_not_found',
        message: 'Sesión no encontrada o expirada. Inicia el proceso nuevamente.'
      });
    }

    // Conectar con el cliente
    const connected = await telegramMTProtoService.connect(userId);
    if (!connected) {
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Verificar contraseña 2FA
    const result = await telegramMTProtoService.signIn(
      userId,
      phoneNumber.trim(),
      '', // Código vacío para 2FA
      session.phoneCodeHash,
      password
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'verification_failed',
        message: result.error || 'Contraseña de 2FA incorrecta'
      });
    }

    if (!result.user || !result.sessionString) {
      return res.status(500).json({
        success: false,
        error: 'authentication_incomplete',
        message: 'Error en el proceso de autenticación'
      });
    }

    // Actualizar sesión con datos del usuario
    session.sessionString = result.sessionString;
    session.phoneCodeHash = undefined;
    session.authState = 'authenticated';
    session.isActive = true;
    session.userInfo = {
      id: result.user.id,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phoneNumber: result.user.phoneNumber,
    };
    session.lastActivity = new Date();
    await session.save();

    // Crear o actualizar integración
    const integration = await Integration.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram',
        externalId: result.user.id.toString()
      },
      {
        name: result.user.username || result.user.firstName || `Telegram User ${result.user.id}`,
        status: 'linked',
        meta: {
          telegramUserId: result.user.id,
          telegramUsername: result.user.username,
          telegramFirstName: result.user.firstName,
          telegramLastName: result.user.lastName,
          telegramPhoneNumber: result.user.phoneNumber,
          sessionString: result.sessionString,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    // Iniciar listener de mensajes en tiempo real
    try {
      await telegramMTProtoService.startMessageListener(userId, async (message) => {
        logger.info('Mensaje recibido en tiempo real', { 
          userId, 
          messageId: message.id,
          chatId: message.chatId 
        });
        
        // Aquí podrías guardar el mensaje en la base de datos
        // o enviarlo via WebSocket al frontend
        // TODO: Implementar guardado en DB y notificación al frontend
      });
    } catch (listenerError) {
      logger.error('Error iniciando listener de mensajes', { 
        userId, 
        error: listenerError instanceof Error ? listenerError.message : 'Error desconocido' 
      });
      // No fallar la autenticación por esto
    }

    res.status(200).json({
      success: true,
      message: 'Telegram conectado exitosamente',
      user: result.user,
      integrationId: integration._id
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/verify-password', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
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

    // Buscar sesión activa
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
      authState: 'authenticated'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'No hay sesión activa de Telegram'
      });
    }

    // Conectar con la sesión
    const connected = await telegramMTProtoService.connect(userId, session.sessionString);
    if (!connected) {
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Obtener chats
    const result = await telegramMTProtoService.getChats(userId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'get_chats_failed',
        message: result.error || 'Error obteniendo chats'
      });
    }

    res.status(200).json({
      success: true,
      chats: result.chats || []
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/chats', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
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
    const limit = parseInt(req.query.limit as string) || 20;

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

    // Buscar sesión activa
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
      authState: 'authenticated'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'No hay sesión activa de Telegram'
      });
    }

    // Conectar con la sesión
    const connected = await telegramMTProtoService.connect(userId, session.sessionString);
    if (!connected) {
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Obtener mensajes
    const result = await telegramMTProtoService.getMessages(userId, parseInt(chatId), limit);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'get_messages_failed',
        message: result.error || 'Error obteniendo mensajes'
      });
    }

    res.status(200).json({
      success: true,
      messages: result.messages || []
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/messages/:chatId', {
      userId: req.user?.id || req.user?._id,
      chatId: req.params.chatId,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
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
    const { chatId, message } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'missing_parameters',
        message: 'ID del chat y mensaje son requeridos'
      });
    }

    // Buscar sesión activa
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
      authState: 'authenticated'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'No hay sesión activa de Telegram'
      });
    }

    // Conectar con la sesión
    const connected = await telegramMTProtoService.connect(userId, session.sessionString);
    if (!connected) {
      return res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }

    // Enviar mensaje
    const result = await telegramMTProtoService.sendMessage(userId, parseInt(chatId), message);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'send_message_failed',
        message: result.error || 'Error enviando mensaje'
      });
    }

    // 💾 Guardar mensaje en la base de datos para analíticas
    try {
      // Buscar la integración de Telegram
      const integration = await Integration.findOne({
        userId: new Types.ObjectId(userId),
        provider: 'telegram',
        status: 'linked'
      });

      if (integration) {
        await Message.create({
          userId: new Types.ObjectId(userId),
          integrationId: integration._id,
          direction: 'out',
          body: message,
          provider: 'telegram',
          externalMessageId: result.messageId?.toString(),
          from: chatId.toString(),
          timestamp: new Date()
        });

        logger.info('Mensaje de Telegram guardado en DB', {
          userId,
          chatId,
          messageId: result.messageId
        });
      }
    } catch (saveError) {
      // No fallar la respuesta si no se pudo guardar en DB
      logger.error('Error guardando mensaje de Telegram en DB', {
        userId,
        chatId,
        error: saveError instanceof Error ? saveError.message : 'Error desconocido'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      messageId: result.messageId
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/send-message', {
      userId: req.user?.id || req.user?._id,
      chatId: req.body.chatId,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /telegram/reset
 * Resetear completamente el sistema de Telegram para un usuario
 */
router.post('/reset', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    logger.info('Iniciando reset completo de Telegram', { userId });

    // 1. Desconectar cliente si existe
    try {
      await telegramMTProtoService.disconnect(userId);
      logger.info('Cliente de Telegram desconectado', { userId });
    } catch (disconnectError) {
      logger.warn('Error desconectando cliente (puede no existir)', { 
        userId, 
        error: disconnectError instanceof Error ? disconnectError.message : 'Error desconocido' 
      });
    }

    // 2. Marcar todas las sesiones como inactivas y error
    const sessionsUpdated = await TelegramSession.updateMany(
      { userId: new Types.ObjectId(userId) },
      { 
        isActive: false,
        authState: 'error',
        phoneCodeHash: undefined,
        sessionString: undefined,
        lastActivity: new Date()
      }
    );

    logger.info('Sesiones de Telegram marcadas como inactivas', { 
      userId, 
      sessionsUpdated: sessionsUpdated.modifiedCount 
    });

    // 3. Actualizar integraciones de Telegram a estado error
    const integrationsUpdated = await Integration.updateMany(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram'
      },
      { 
        status: 'error',
        'meta.isActive': false,
        'meta.sessionString': undefined
      }
    );

    logger.info('Integraciones de Telegram actualizadas', { 
      userId, 
      integrationsUpdated: integrationsUpdated.modifiedCount 
    });

    // 4. Limpiar caché del servicio
    telegramMTProtoService['clients'].delete(userId);
    telegramMTProtoService['sessions'].delete(userId);

    logger.info('Reset completo de Telegram finalizado', { userId });

    res.status(200).json({
      success: true,
      message: 'Sistema de Telegram reseteado completamente',
      details: {
        sessionsReset: sessionsUpdated.modifiedCount,
        integrationsReset: integrationsUpdated.modifiedCount
      }
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/reset', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor durante el reset'
    });
  }
});

/**
 * DELETE /telegram/disconnect
 * Desconectar sesión de Telegram
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

    // Buscar sesión activa
    const session = await TelegramSession.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'No hay sesión activa de Telegram'
      });
    }

    // Desconectar cliente
    await telegramMTProtoService.disconnect(userId);

    // Marcar sesión como inactiva
    session.isActive = false;
    session.authState = 'error';
    await session.save();

    // Actualizar integración
    await Integration.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram',
        externalId: session.userInfo?.id?.toString()
      },
      { 
        status: 'error',
        'meta.isActive': false
      }
    );

    logger.info('Telegram desconectado exitosamente', { userId });

    res.status(200).json({
      success: true,
      message: 'Telegram desconectado exitosamente'
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/disconnect', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

export default router;