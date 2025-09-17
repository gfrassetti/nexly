import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import handleAuth from "../middleware/auth";
import { Message } from "../models/Message";
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

// Listar mensajes por contacto o integración
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const contactId = req.query.contactId as string | undefined;
    const integrationId = req.query.integrationId as string | undefined;

    const filter: any = { userId: buildUserIdFilter(rawUserId) };
    if (contactId) filter.contactId = contactId;
    if (integrationId) filter.integrationId = integrationId;

    const messages = await Message.find(filter).sort({ createdAt: 1 }).lean();
    return res.json(messages ?? []);
  } catch (err: any) {
    console.error("messages_list_failed:", err?.message || err);
    return res.status(500).json({ error: "messages_list_failed", detail: err?.message });
  }
});

// Enviar mensaje hacia una integración
router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider, to, body } = req.body;
    if (!provider || !to || !body) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const integration = await Integration.findOne({ userId: buildUserIdFilter(rawUserId), provider });
    if (!integration) return res.status(400).json({ error: "no_integration_found" });

    // TODO: Aquí deberías llamar a la API real de Meta/Instagram/Messenger
    console.log(`[SEND] ${provider} -> ${to}: ${body}`);

    // asegurar contacto
    let contact = await Contact.findOne({ userId: buildUserIdFilter(rawUserId), phone: to });
    if (!contact) {
      contact = await Contact.create({
        userId: buildUserIdFilter(rawUserId),
        integrationId: integration._id,
        name: to,
        phone: to,
        email: "",
      });
    }

    const msg = await Message.create({
      userId: buildUserIdFilter(rawUserId),
      contactId: contact._id,
      integrationId: integration._id,
      direction: "out",
      body,
    });

    return res.json(msg);
  } catch (err: any) {
    console.error("message_send_failed:", err?.message || err);
    return res.status(500).json({ error: "message_send_failed", detail: err?.message });
  }
});

export default router;

