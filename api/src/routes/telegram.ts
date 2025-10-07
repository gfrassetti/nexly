import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { telegramMTProtoService } from '../services/telegramMTProtoService';
import { TelegramSession } from '../models/TelegramSession';
import { Integration } from '../models/Integration';
import { checkIntegrationLimits } from '../services/messageLimits';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

/**
 * GET /telegram/debug/config
 * Debug endpoint para verificar configuración de Telegram
 */
router.get('/debug/config', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const config = {
      telegramApiId: process.env.TELEGRAM_API_ID,
      telegramApiHash: process.env.TELEGRAM_API_HASH ? '***' : undefined,
      nodeEnv: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('TELEGRAM')),
    };

    logger.info('Debug config de Telegram', { userId, config });

    res.status(200).json({
      success: true,
      config
    });
  } catch (error: unknown) {
    logger.error('Error en debug config', {
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
 * GET /telegram/debug/test-connection
 * Debug endpoint para probar conexión con Telegram
 */
router.get('/debug/test-connection', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    logger.info('Probando conexión con Telegram', { userId });
    
    const connected = await telegramMTProtoService.connect(userId);
    
    if (connected) {
      logger.info('Conexión con Telegram exitosa', { userId });
      res.status(200).json({
        success: true,
        message: 'Conexión con Telegram exitosa'
      });
    } else {
      logger.error('Error en conexión con Telegram', { userId });
      res.status(500).json({
        success: false,
        error: 'connection_failed',
        message: 'No se pudo conectar con Telegram'
      });
    }
  } catch (error: unknown) {
    logger.error('Error en test de conexión', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error instanceof Error ? error.message : 'Error interno del servidor'
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

    // Verificar si ya existe una sesión activa
    let existingSession = await TelegramSession.findOne({ 
      userId: new Types.ObjectId(userId), 
      isActive: true 
    });

    if (existingSession) {
      // Si existe una sesión, intentar reconectar
      const connected = await telegramMTProtoService.connect(userId, existingSession.sessionString);
      if (connected) {
        return res.status(200).json({
          success: true,
          message: 'Sesión existente reconectada',
          requiresCode: false,
          requiresPassword: false
        });
      } else {
        // Si no se puede reconectar, marcar como inactiva y continuar
        existingSession.isActive = false;
        existingSession.authState = 'error';
        await existingSession.save();
      }
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
            logger.info('Enviando código de verificación', { userId, phoneNumber });
            
            let result;
            try {
              result = await telegramMTProtoService.sendCode(phoneNumber);
              logger.info('Resultado de sendCode', { 
                userId, 
                phoneNumber, 
                result, 
                phoneCodeHash: result?.phoneCodeHash,
                hasPhoneCodeHash: !!result?.phoneCodeHash
              });
            } catch (sendCodeError) {
              logger.error('Error en sendCode() de Telegram', { 
                userId, 
                phoneNumber, 
                error: sendCodeError instanceof Error ? sendCodeError.message : 'Error desconocido',
                stack: sendCodeError instanceof Error ? sendCodeError.stack : undefined
              });
              return res.status(500).json({
                success: false,
                error: 'send_code_failed',
                message: sendCodeError instanceof Error ? sendCodeError.message : 'Error enviando código de verificación'
              });
            }
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'send_code_failed',
        message: result.error || 'Error enviando código de verificación'
      });
    }

            // Crear o actualizar sesión con phoneCodeHash
            const sessionData = {
              userId: new Types.ObjectId(userId),
              phoneNumber: phoneNumber.trim(),
              sessionString: '', // Se llenará después de la autenticación
              phoneCodeHash: result.phoneCodeHash,
              authState: 'pending_code' as const,
              isActive: false, // Se activará después de la autenticación exitosa
            };

            logger.info('Guardando sesión en DB', { 
              userId, 
              phoneNumber, 
              phoneCodeHash: result.phoneCodeHash,
              hasExistingSession: !!existingSession,
              sessionData 
            });

            try {
              if (existingSession) {
                await TelegramSession.findByIdAndUpdate(existingSession._id, sessionData);
                logger.info('Sesión actualizada en DB', { userId, sessionId: existingSession._id });
              } else {
                const newSession = await TelegramSession.create(sessionData);
                logger.info('Nueva sesión creada en DB', { userId, sessionId: newSession._id });
              }
            } catch (dbError) {
              logger.error('Error guardando sesión en DB', { 
                userId, 
                phoneNumber, 
                error: dbError instanceof Error ? dbError.message : 'Error desconocido',
                stack: dbError instanceof Error ? dbError.stack : undefined
              });
              throw dbError; // Re-lanzar para que sea capturado por el catch principal
            }

    logger.info('Código de verificación enviado', { userId, phoneNumber });

    res.status(200).json({
      success: true,
      message: 'Código de verificación enviado',
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
      phoneNumber.trim(),
      code.trim(),
      session.phoneCodeHash,
      password
    );

    if (!result.success) {
      if (result.requiresPassword) {
        // Actualizar sesión para requerir contraseña
        session.authState = 'pending_password';
        await session.save();

        return res.status(200).json({
          success: false,
          requiresPassword: true,
          message: 'Se requiere contraseña de autenticación de dos factores'
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
    session.phoneCodeHash = undefined; // Limpiar el hash
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

    logger.info('Telegram autenticado exitosamente', { 
      userId, 
      telegramUserId: result.user.id,
      integrationId: integration._id
    });

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
    const result = await telegramMTProtoService.getChats();
    
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
    const result = await telegramMTProtoService.getMessages(parseInt(chatId), limit);
    
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
    const result = await telegramMTProtoService.sendMessage(parseInt(chatId), message);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'send_message_failed',
        message: result.error || 'Error enviando mensaje'
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
    await telegramMTProtoService.disconnect();

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