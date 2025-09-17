import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import handleAuth from "../middleware/auth";
import { Contact } from "../models/Contact";
import { Integration } from "../models/Integration";

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
    const filter: any = { userId: buildUserIdFilter(rawUserId) };
    if (integrationId) filter.integrationId = integrationId;

    const contacts = await Contact.find(filter).lean();
    return res.json(contacts ?? []);
  } catch (err: any) {
    console.error("contacts_list_failed:", err?.message || err);
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


