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
    
    if (archived) {
      // Obtener contactos archivados
      const filter: any = { userId: buildUserIdFilter(rawUserId) };
      if (integrationId && integrationId !== "all") {
        filter.integrationId = integrationId;
      }

      const archivedContacts = await Archive.find(filter).lean();
      
      // Transformar datos del Archive al formato de Contact
      const contacts = archivedContacts.map(archive => ({
        _id: archive.contactId,
        userId: archive.userId,
        integrationId: archive.integrationId,
        provider: archive.provider,
        name: archive.contactSnapshot?.name || '',
        phone: archive.contactSnapshot?.phone || '',
        email: archive.contactSnapshot?.email || '',
        avatar: archive.contactSnapshot?.avatar || '',
        profilePicture: archive.contactSnapshot?.profilePicture || '',
        platformData: archive.contactSnapshot?.platformData || {},
        archivedAt: archive.archivedAt,
        archivedBy: archive.archivedBy,
        reason: archive.reason,
        notes: archive.notes,
        tags: archive.tags,
        status: "archived",
        createdAt: archive.createdAt,
        updatedAt: archive.updatedAt
      }));

      logger.info('Archived contacts fetched', { 
        userId: rawUserId, 
        integrationId,
        count: contacts.length 
      });

      return res.json(contacts);
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

    // 📊 DB: Consultar desde la base de datos (solo contactos activos)
    const filter: any = { userId: buildUserIdFilter(rawUserId) };
    if (integrationId && integrationId !== "all") {
      filter.integrationId = integrationId;
    }

    const contacts = await Contact.find(filter).lean();
    
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

// Archivar/desarchivar un contacto
router.patch("/:id/archive", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { archived = true } = req.body;

    if (archived) {
      // ARCHIVAR: Crear entrada en Archive y eliminar de Contact
      const contact = await Contact.findOne({
        _id: req.params.id,
        userId: buildUserIdFilter(rawUserId),
      });

      if (!contact) return res.status(404).json({ error: "not_found" });

      // Crear snapshot del contacto en Archive
      const archiveEntry = new Archive({
        userId: buildUserIdFilter(rawUserId),
        contactId: contact._id,
        integrationId: contact.integrationId,
        provider: contact.provider,
        contactSnapshot: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          avatar: contact.avatar,
          profilePicture: contact.profilePicture,
          platformData: contact.platformData
        },
        archivedBy: "user",
        reason: "manual"
      });

      await archiveEntry.save();

      // Eliminar de Contact
      await Contact.findByIdAndDelete(contact._id);

      logger.info('Contact archived', { 
        userId: rawUserId, 
        contactId: req.params.id,
        archiveId: archiveEntry._id
      });

      return res.json({ 
        success: true, 
        message: "Contacto archivado exitosamente",
        archiveId: archiveEntry._id
      });

    } else {
      // DESARCHIVAR: Restaurar desde Archive a Contact
      const archiveEntry = await Archive.findOne({
        contactId: req.params.id,
        userId: buildUserIdFilter(rawUserId),
      });

      if (!archiveEntry) return res.status(404).json({ error: "not_found" });

      // Restaurar contacto
      const restoredContact = new Contact({
        userId: archiveEntry.userId,
        integrationId: archiveEntry.integrationId,
        provider: archiveEntry.provider,
        name: archiveEntry.contactSnapshot?.name || '',
        phone: archiveEntry.contactSnapshot?.phone || '',
        email: archiveEntry.contactSnapshot?.email || '',
        avatar: archiveEntry.contactSnapshot?.avatar || '',
        profilePicture: archiveEntry.contactSnapshot?.profilePicture || '',
        platformData: archiveEntry.contactSnapshot?.platformData || {},
        status: "active"
      });

      await restoredContact.save();

      // Eliminar de Archive
      await Archive.findByIdAndDelete(archiveEntry._id);

      logger.info('Contact unarchived', { 
        userId: rawUserId, 
        contactId: req.params.id,
        restoredContactId: restoredContact._id
      });

      return res.json({ 
        success: true, 
        message: "Contacto desarchivado exitosamente",
        contact: restoredContact
      });
    }

    // Limpiar cache
    await cacheService.clearContacts(rawUserId || '');

  } catch (err: any) {
    logger.error("contacts_archive_failed:", err?.message || err);
    return res.status(500).json({ error: "contacts_archive_failed", detail: err?.message });
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

    if (archived) {
      // Archivar contacto
      const contact = await Contact.findOne({ _id: contactId, userId });
      if (!contact) {
        return res.status(404).json({ error: "contact_not_found" });
      }

      // Verificar si ya está archivado
      const existingArchive = await Archive.findOne({ contactId, userId });
      if (existingArchive) {
        return res.status(400).json({ error: "contact_already_archived" });
      }

      // Crear entrada en Archive
      await Archive.create({
        contactId,
        userId,
        integrationId: contact.integrationId,
        provider: contact.provider,
        contactSnapshot: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          externalId: contact.externalId,
          avatar: contact.avatar,
          profilePicture: contact.profilePicture,
          platformData: contact.platformData,
          lastInteraction: contact.lastInteraction,
          lastMessagePreview: contact.lastMessagePreview,
          unreadCount: contact.unreadCount,
          tags: contact.tags,
          notes: contact.notes,
          isFavorite: contact.isFavorite,
          isBlocked: contact.isBlocked,
          status: contact.status
        }
      });

      // Eliminar de Contact
      await Contact.deleteOne({ _id: contactId, userId });

      logger.info('Contact archived', { contactId, userId, provider: contact.provider });
      res.json({ message: "Contacto archivado exitosamente" });
    } else {
      // Desarchivar contacto
      const archive = await Archive.findOne({ contactId, userId });
      if (!archive) {
        return res.status(404).json({ error: "archived_contact_not_found" });
      }

      // Restaurar contacto
      await Contact.create({
        _id: contactId,
        userId: archive.userId,
        integrationId: archive.integrationId,
        provider: archive.provider,
        ...archive.contactSnapshot
      });

      // Eliminar de Archive
      await Archive.deleteOne({ _id: archive._id });

      logger.info('Contact unarchived', { contactId, userId, provider: archive.provider });
      res.json({ message: "Contacto recuperado exitosamente" });
    }

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


