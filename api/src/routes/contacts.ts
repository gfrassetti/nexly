import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import handleAuth from "../middleware/auth";
import { Contact } from "../models/Contact";
import { Integration } from "../models/Integration";
import { contactSyncService } from "../services/contactSyncService";
import { cacheService } from "../services/cacheService";
import logger from "../utils/logger";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();
router.use(handleAuth);

function buildUserIdFilter(rawUserId: string) {
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
    
    // 🚀 CACHE: Intentar obtener desde Redis primero
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
    if (integrationId) filter.integrationId = integrationId;

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


