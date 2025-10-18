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
          // ✅ ARREGLO: Crear/actualizar integración cuando se reconecta sesión existente
          try {
            // Obtener información del usuario de Telegram
            const userInfo = await telegramMTProtoService.getUserInfo(userId);
            
            if (userInfo) {
              const integration = await Integration.findOneAndUpdate(
                { 
                  userId: new Types.ObjectId(userId), 
                  provider: 'telegram',
                  externalId: userInfo.id.toString()
                },
                {
                  name: userInfo.username || userInfo.firstName || `Telegram User ${userInfo.id}`,
                  status: 'active',
                  meta: {
                    telegramUserId: userInfo.id,
                    telegramUsername: userInfo.username,
                    telegramFirstName: userInfo.firstName,
                    telegramLastName: userInfo.lastName,
                    telegramPhoneNumber: userInfo.phoneNumber,
                    sessionString: existingSession.sessionString,
                    isActive: true,
                  },
                },
                { upsert: true, new: true }
              );

              logger.info('Integración de Telegram creada/actualizada al reconectar', {
                userId,
                integrationId: integration._id,
                status: integration.status,
                name: integration.name
              });
            }
          } catch (integrationError) {
            logger.warn('Error creando integración al reconectar', {
              userId,
              error: integrationError instanceof Error ? integrationError.message : 'Error desconocido'
            });
            // No fallar la reconexión por esto
          }

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

    // ✅ CORRECCIÓN CRÍTICA: Crear o actualizar integración con status 'active'
    logger.info('Creando/actualizando integración de Telegram', {
      userId,
      telegramUserId: result.user.id,
      username: result.user.username,
      firstName: result.user.firstName
    });

    const integration = await Integration.findOneAndUpdate(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram',
        externalId: result.user.id.toString()
      },
      {
        name: result.user.username || result.user.firstName || `Telegram User ${result.user.id}`,
        status: 'active', // ✅ CAMBIO CRÍTICO: 'active' en lugar de 'linked'
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

    logger.info('Integración de Telegram creada/actualizada exitosamente', {
      userId,
      integrationId: integration._id,
      status: integration.status,
      name: integration.name,
      isActive: integration.meta?.isActive
    });

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
 * POST /telegram/disconnect
 * Desconectar la integración de Telegram del usuario
 */
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    logger.info('Desconectando Telegram', { userId });

    // Desconectar el cliente de Telegram
    try {
      await telegramMTProtoService.disconnect(userId);
      logger.info('Cliente de Telegram desconectado', { userId });
    } catch (disconnectError) {
      logger.warn('Error desconectando cliente (puede no existir)', { 
        userId, 
        error: disconnectError instanceof Error ? disconnectError.message : 'Error desconocido' 
      });
    }

    // Marcar la sesión como inactiva
    const sessionUpdated = await TelegramSession.updateOne(
      { userId: new Types.ObjectId(userId) },
      { 
        isActive: false,
        lastActivity: new Date()
      }
    );

    logger.info('Sesión de Telegram marcada como inactiva', { 
      userId, 
      sessionUpdated: sessionUpdated.modifiedCount 
    });

    // Marcar la integración como desconectada
    const integrationUpdated = await Integration.updateOne(
      { 
        userId: new Types.ObjectId(userId), 
        provider: 'telegram'
      },
      { 
        status: 'disconnected',
        'meta.isActive': false
      }
    );

    logger.info('Integración de Telegram marcada como desconectada', { 
      userId, 
      integrationUpdated: integrationUpdated.modifiedCount 
    });

    res.status(200).json({
      success: true,
      message: 'Telegram desconectado exitosamente',
      details: {
        sessionUpdated: sessionUpdated.modifiedCount,
        integrationUpdated: integrationUpdated.modifiedCount
      }
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/disconnect', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor durante la desconexión'
    });
  }
});

/**
 * POST /telegram/reset
 * Reset completo de la integración de Telegram
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

    try {
      await telegramMTProtoService.disconnect(userId);
      logger.info('Cliente de Telegram desconectado', { userId });
    } catch (disconnectError) {
      logger.warn('Error desconectando cliente (puede no existir)', { 
        userId, 
        error: disconnectError instanceof Error ? disconnectError.message : 'Error desconocido' 
      });
    }

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
 * GET /telegram/chats
 * Obtener lista de chats/conversaciones de Telegram
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

    logger.info('Obteniendo chats de Telegram', { userId });

    // Verificar que el usuario tenga una integración de Telegram activa
    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'telegram',
      status: { $in: ['active', 'linked'] }
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'telegram_not_connected',
        message: 'Telegram no está conectado'
      });
    }

    // Obtener chats usando el servicio de Telegram
    const result = await telegramMTProtoService.getChats(userId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'chats_fetch_failed',
        message: result.error || 'Error obteniendo chats de Telegram'
      });
    }

    logger.info('Chats de Telegram obtenidos exitosamente', { 
      userId, 
      chatCount: result.chats?.length || 0
    });

    res.json({
      success: true,
      chats: result.chats || [],
      count: result.chats?.length || 0
    });

  } catch (error: unknown) {
    logger.error('Error en /telegram/chats', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

export default router;
