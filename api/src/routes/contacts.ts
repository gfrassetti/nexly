import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/auth";
import { Contact } from "../models/Contact";
import { Integration } from "../models/Integration";
import { Archive } from "../models/Archive";
import { contactSyncService } from "../services/contactSyncService";
import { cacheService } from "../services/cacheService";
import logger from "../utils/logger";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();
router.use(requireAuth);

function buildUserIdFilter(rawUserId: string | null | undefined) {
  if (!rawUserId) {
    throw new Error("User ID is required");
  }
  if (mongoose.isValidObjectId(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  return rawUserId;
}

// Listar contactos de un usuario, opcionalmente filtrando por integración
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const integrationId = req.query.integrationId as string | undefined;
    const archived = req.query.archived === 'true';

    // 🚀 TELEGRAM: Si es Telegram, usar la misma lógica que inbox
    if (integrationId === 'telegram') {
      logger.info('Fetching Telegram contacts via API (like inbox)', { userId: rawUserId });
      
      // Importar el servicio de Telegram
      const { telegramMTProtoService } = require('../services/telegramMTProtoService');
      const { TelegramSession } = require('../models/TelegramSession');
      const { Types } = require('mongoose');

      // Buscar sesión activa
      const session = await TelegramSession.findOne({
        userId: new Types.ObjectId(rawUserId),
        isActive: true,
        authState: 'authenticated'
      });

      if (!session) {
        logger.info('No active Telegram session found', { userId: rawUserId });
        return res.json([]);
      }

      // Conectar con la sesión
      const connected = await telegramMTProtoService.connect(rawUserId, session.sessionString);
      if (!connected) {
        logger.error('Failed to connect to Telegram', { userId: rawUserId });
        return res.json([]);
      }

      // Obtener chats (contactos)
      const result = await telegramMTProtoService.getChats(rawUserId);
      
      if (!result.success) {
        logger.error('Failed to get Telegram chats', { 
          userId: rawUserId, 
          error: result.error 
        });
        return res.json([]);
      }

      // Mapear los chats a formato de contactos
      const telegramContacts = (result.chats || []).map((chat: any) => ({
        _id: chat.id,
        name: chat.title || chat.firstName || 'Sin nombre',
        provider: 'telegram',
        integrationId: session._id,
        userId: rawUserId,
        isArchived: false, // Por ahora siempre false, ya que Telegram no tiene concepto de "archivado"
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount || 0,
        avatar: chat.photo,
        phone: chat.phone,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 🚀 FILTRAR por estado de archivado
      // Para Telegram, si se piden archivados, devolver array vacío
      // ya que Telegram no tiene concepto de contactos archivados
      if (archived) {
        logger.info('Telegram contacts: requested archived but Telegram has no archived concept', { 
          userId: rawUserId, 
          count: 0 
        });
        return res.json([]);
      }

      logger.info('Telegram contacts fetched via API', { 
        userId: rawUserId, 
        count: telegramContacts.length 
      });

      return res.json(telegramContacts);
    }

    // 🚀 CACHE: Intentar obtener desde Redis primero (solo para contactos activos)
    const cachedContacts = await cacheService.getContacts(rawUserId, integrationId);
    if (cachedContacts) {
      logger.info('Contacts served from cache', { 
        userId: rawUserId, 
        integrationId,
        count: cachedContacts.length 
      });
      return res.json(cachedContacts);
    }

    // 📊 DB: Consultar desde la base de datos
    const filter: any = { userId: buildUserIdFilter(rawUserId) };
    if (integrationId) {
      filter.provider = integrationId;
    }
    
    // Filtrar por estado de archivado
    filter.isArchived = archived;

    const contacts = await Contact.find(filter).lean();
    
    // DEBUG: Log para verificar filtros y todos los contactos
    const allContacts = await Contact.find({ userId: buildUserIdFilter(rawUserId) }).lean();
    logger.info('DEBUG - All contacts in DB', { 
      userId: rawUserId, 
      totalContacts: allContacts.length,
      allContacts: allContacts.map(c => ({ id: c._id, name: c.name, provider: c.provider, isArchived: c.isArchived }))
    });
    
    logger.info('DEBUG - Contact filter applied', { 
      userId: rawUserId, 
      integrationId,
      filter,
      count: contacts.length,
      contacts: contacts.map(c => ({ id: c._id, name: c.name, provider: c.provider }))
    });
    
    // 💾 CACHE: Guardar en Redis para próximas consultas (10 min TTL)
    await cacheService.setContacts(rawUserId, contacts, 600, integrationId);

    logger.info('Contacts fetched from DB and cached', { 
      userId: rawUserId, 
      integrationId,
      count: contacts.length 
    });

    return res.json(contacts ?? []);
  } catch (err: any) {
    logger.error("contacts_list_failed:", err?.message || err);
    return res.status(500).json({ error: "contacts_list_failed", detail: err?.message });
  }
});

// Obtener detalle de un contacto
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const contact = await Contact.findOne({
      _id: req.params.id,
      userId: buildUserIdFilter(rawUserId),
    }).lean();

    if (!contact) return res.status(404).json({ error: "not_found" });
    return res.json(contact);
  } catch (err: any) {
    console.error("contacts_get_failed:", err?.message || err);
    return res.status(500).json({ error: "contacts_get_failed", detail: err?.message });
  }
});

// 🚨 Eliminamos create/update manuales → contactos ahora se crean vía sincronización automática

// Sincronizar todos los contactos del usuario
router.post("/sync", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    logger.info('Iniciando sincronización de contactos', { userId: rawUserId });

    const results = await contactSyncService.syncAllIntegrations(rawUserId.toString());

    const totalSynced = results.reduce((acc, r) => acc + r.contactsSynced, 0);
    const totalCreated = results.reduce((acc, r) => acc + r.contactsCreated, 0);
    const totalUpdated = results.reduce((acc, r) => acc + r.contactsUpdated, 0);
    const hasErrors = results.some(r => !r.success);

    // 🗑️ CACHE: Invalidar cache de contactos y stats después de sincronización
    if (totalCreated > 0 || totalUpdated > 0) {
      await cacheService.invalidateUserCache(rawUserId);
      logger.info('Cache invalidated after contact sync', { 
        userId: rawUserId,
        totalCreated,
        totalUpdated
      });
    }

    logger.info('Sincronización completada', { 
      userId: rawUserId,
      totalSynced,
      totalCreated,
      totalUpdated,
      hasErrors
    });

    return res.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Sincronización completada con algunos errores'
        : 'Contactos sincronizados exitosamente',
      results,
      summary: {
        totalSynced,
        totalCreated,
        totalUpdated
      }
    });
  } catch (err: any) {
    logger.error("contacts_sync_failed:", err?.message || err);
    return res.status(500).json({ 
      error: "contacts_sync_failed", 
      detail: err?.message 
    });
  }
});

// Sincronizar contactos por provider (telegram, whatsapp, etc.)
router.post("/sync/provider/:provider", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider } = req.params;

    logger.info('Sincronizando por provider', { 
      userId: rawUserId,
      provider
    });

    // Buscar la integración por provider
    const integration = await Integration.findOne({
      userId: buildUserIdFilter(rawUserId),
      provider: provider
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: `No se encontró integración para ${provider}`
      });
    }

    const result = await contactSyncService.syncIntegration(
      rawUserId.toString(),
      (integration._id as any).toString()
    );

    logger.info('Sincronización por provider completada', { 
      userId: rawUserId,
      provider,
      integrationId: integration._id,
      result
    });

    return res.json({
      success: result.success,
      message: result.success 
        ? `${provider} sincronizado exitosamente`
        : `Error al sincronizar ${provider}`,
      result
    });

  } catch (err: any) {
    logger.error("contacts_sync_provider_failed:", err?.message || err);
    return res.status(500).json({ 
      error: "contacts_sync_provider_failed", 
      detail: err?.message 
    });
  }
});

// Sincronizar contactos de una integración específica
router.post("/sync/:integrationId", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { integrationId } = req.params;

    logger.info('Sincronizando integración específica', { 
      userId: rawUserId,
      integrationId
    });

    const result = await contactSyncService.syncIntegration(
      rawUserId.toString(),
      integrationId
    );

    logger.info('Sincronización de integración completada', { 
      userId: rawUserId,
      integrationId,
      success: result.success,
      synced: result.contactsSynced
    });

    return res.json({
      success: result.success,
      message: result.success 
        ? `Contactos de ${result.provider} sincronizados exitosamente`
        : `Error sincronizando contactos: ${result.error}`,
      result
    });
  } catch (err: any) {
    logger.error("contacts_sync_integration_failed:", err?.message || err);
    return res.status(500).json({ 
      error: "contacts_sync_integration_failed", 
      detail: err?.message 
    });
  }
});

// 🔍 ENDPOINT TEMPORAL PARA DEBUG
router.get("/debug", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const userId = buildUserIdFilter(rawUserId);
    
    // Obtener TODOS los contactos del usuario
    const allContacts = await Contact.find({ userId }).lean();
    
    // Obtener contactos por provider
    const telegramContacts = await Contact.find({ userId, provider: "telegram" }).lean();
    const instagramContacts = await Contact.find({ userId, provider: "instagram" }).lean();
    
    res.json({
      userId: rawUserId,
      totalContacts: allContacts.length,
      allContacts: allContacts.map(c => ({
        id: c._id,
        name: c.name,
        provider: c.provider,
        isArchived: c.isArchived,
        integrationId: c.integrationId
      })),
      telegramCount: telegramContacts.length,
      telegramContacts: telegramContacts.map(c => ({
        id: c._id,
        name: c.name,
        provider: c.provider,
        isArchived: c.isArchived
      })),
      instagramCount: instagramContacts.length,
      instagramContacts: instagramContacts.map(c => ({
        id: c._id,
        name: c.name,
        provider: c.provider,
        isArchived: c.isArchived
      }))
    });
  } catch (err: any) {
    logger.error("debug_contacts_failed:", err?.message || err);
    return res.status(500).json({ error: "debug_contacts_failed", detail: err?.message });
  }
});

// Archivar/desarchivar contacto
router.patch("/:contactId/archive", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { contactId } = req.params;
    const { archived } = req.body;

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: "archived parameter must be boolean" });
    }

    const userId = buildUserIdFilter(rawUserId);

    // Actualizar el campo isArchived directamente
    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, userId },
      { 
        isArchived: archived,
        status: archived ? "archived" : "active"
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: "contact_not_found" });
    }

    logger.info('Contact archive status updated', { 
      contactId, 
      userId, 
      provider: contact.provider,
      isArchived: archived 
    });

    res.json({ 
      message: archived ? "Contacto archivado exitosamente" : "Contacto recuperado exitosamente",
      isArchived: archived
    });

    // Invalidar cache
    await cacheService.invalidateUserCache(rawUserId);

  } catch (err: any) {
    logger.error("archive_contact_failed:", err?.message || err);
    return res.status(500).json({ error: "archive_contact_failed", detail: err?.message });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const deleted = await Contact.findOneAndDelete({
      _id: req.params.id,
      userId: buildUserIdFilter(rawUserId),
    }).lean();

    if (!deleted) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("contacts_delete_failed:", err?.message || err);
    return res.status(400).json({ error: "contacts_delete_failed", detail: err?.message });
  }
});

export default router;


