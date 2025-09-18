// src/routes/integrations.ts
import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import handleAuth from "../middleware/auth";
import { Integration, IntegrationDoc } from "../models/Integration";
import { syncIntegration } from "../services/syncIntegration";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

// Todas requieren JWT
router.use(handleAuth);

/**
 * GET /integrations
 * Lista integraciones del usuario autenticado.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const items = await Integration.find({ userId }).lean();
    // Aseguramos shape estable: status/meta presentes aunque sean undefined
    const withShape = items.map((it) => ({
      _id: it._id,
      userId: it.userId,
      provider: it.provider,
      externalId: it.externalId,
      phoneNumberId: it.phoneNumberId,
      accessToken: it.accessToken ? "********" : undefined, // nunca devolver token en claro
      name: it.name,
      status: it.status ?? "pending",
      meta: it.meta ?? {},
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }));
    res.json(withShape);
  } catch (err) {
    console.error("integrations_list_failed:", err);
    res.status(500).json({ error: "integrations_list_failed" });
  }
});

/**
 * POST /integrations
 * Crea una integración (modo simple: sólo provider) con status `pending`.
 * Luego dispara syncIntegration para completar datos y pasar a `linked` o `error`.
 *
 * Body:
 *  - provider: "whatsapp" | "instagram" | "messenger" (requerido)
 *  - externalId?: string            (recomendado: phone_number_id en WhatsApp)
 *  - phoneNumberId?: string         (WhatsApp)
 *  - accessToken?: string           (token por integración si lo usas)
 *  - name?: string
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider, externalId, phoneNumberId, accessToken, name } = req.body || {};
    if (!provider) return res.status(400).json({ error: "missing_provider" });

    // Si no pasan externalId/phoneNumberId ahora, igual creamos pendiente.
    const doc = await Integration.create({
      userId: new Types.ObjectId(userId),
      provider,
      externalId,
      phoneNumberId,
      accessToken,
      name,
      status: "pending",
    } as Partial<IntegrationDoc>);

    // Disparamos sync (bloqueante aquí — si prefieres, podrías encolar)
    const sync = await syncIntegration(doc);

    // Releemos para devolver estado/meta actualizados
    const fresh = await Integration.findById(doc._id).lean();

    res.status(201).json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined, // no exponer
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync,
    });
  } catch (err: any) {
    // Duplicado por unique index (userId+provider+externalId)
    if (err?.code === 11000) {
      return res.status(409).json({ error: "integration_already_exists" });
    }
    console.error("integration_create_failed:", err);
    res.status(500).json({ error: "integration_create_failed" });
  }
});

/**
 * POST /integrations/:id/sync
 * Fuerza re-sincronización de una integración existente.
 */
router.post("/:id/sync", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const integration = await Integration.findOne({ _id: id, userId });
    if (!integration) return res.status(404).json({ error: "not_found" });

    const result = await syncIntegration(integration);

    const fresh = await Integration.findById(id).lean();
    res.json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined,
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync: result,
    });
  } catch (err) {
    console.error("integration_sync_failed:", err);
    res.status(500).json({ error: "integration_sync_failed" });
  }
});

/**
 * PUT /integrations/:id
 * Actualiza campos editables (ej: name, phoneNumberId, accessToken, externalId)
 * y vuelve a intentar sync.
 */
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const allowed: Partial<IntegrationDoc> = {};
    const { name, phoneNumberId, accessToken, externalId } = req.body || {};

    if (typeof name === "string") allowed.name = name;
    if (typeof phoneNumberId === "string") allowed.phoneNumberId = phoneNumberId;
    if (typeof accessToken === "string") allowed.accessToken = accessToken;
    if (typeof externalId === "string") allowed.externalId = externalId;

    const updated = await Integration.findOneAndUpdate(
      { _id: id, userId },
      { $set: allowed },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "not_found" });

    // re-sync después de actualizar credenciales/ids
    const sync = await syncIntegration(updated);

    const fresh = await Integration.findById(id).lean();
    res.json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined,
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "integration_already_exists" });
    }
    console.error("integration_update_failed:", err);
    res.status(500).json({ error: "integration_update_failed" });
  }
});

/**
 * DELETE /integrations/:id
 * Elimina una integración del usuario.
 */
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const deleted = await Integration.findOneAndDelete({ _id: id, userId }).lean();
    if (!deleted) return res.status(404).json({ error: "not_found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("integration_delete_failed:", err);
    res.status(500).json({ error: "integration_delete_failed" });
  }
});

export default router;
