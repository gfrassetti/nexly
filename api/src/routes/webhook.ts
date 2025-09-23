import { Router } from "express";
import { config } from "../config";
import { Contact } from "../models/Contact";
import { Message } from "../models/Message";
import { Integration } from "../models/Integration";
import { verifyMetaSignature } from "../middleware/verifyMetaSignature";

const router = Router();

// GET verify (Meta)
router.get("/", (req, res) => {
  console.log("🔍 Webhook verification attempt:");
  console.log("  - Received token:", req.query["hub.verify_token"]);
  console.log("  - Expected token:", config.webhookVerifyToken);
  console.log("  - Challenge:", req.query["hub.challenge"]);
  
  if (req.query["hub.verify_token"] === config.webhookVerifyToken) {
    console.log("✅ Webhook verification successful");
    return res.status(200).send(req.query["hub.challenge"]);
  }
  
  console.log("❌ Webhook verification failed");
  res.sendStatus(403);
});

// POST
router.post("/", verifyMetaSignature, async (req, res) => {
  try {
    // Solo validar firma en prod
    if (process.env.NODE_ENV === "production") {
      const ok = verifyMetaSignature(req);
      if (!ok) return res.status(401).send("Unauthorized");
    }

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    if (!change) return res.sendStatus(200);

    const phoneNumberId = change?.metadata?.phone_number_id;
    const integration = await Integration.findOne({
      provider: "whatsapp",
      $or: [{ phoneNumberId }, { externalId: phoneNumberId }],
    });
    if (!integration) return res.sendStatus(202);

    const userId = integration.userId;
    const messages = change?.messages || [];

    for (const msg of messages) {
      const phone = msg.from;
      let contact = await Contact.findOne({ userId, phone });
      if (!contact) {
        contact = await Contact.create({
          userId,
          name: phone,
          phone,
          email: "",
        });
      }

      if (msg.type === "text" && msg.text?.body) {
        await Message.create({
          userId,
          contactId: contact._id,
          direction: "in",
          body: msg.text.body,
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("POST /webhook error:", err);
    res.sendStatus(500);
  }
});

// Endpoint para probar manualmente el webhook
router.get("/test", (req, res) => {
  const testChallenge = "test_challenge_" + Date.now();
  console.log("🧪 Testing webhook endpoint");
  console.log("  - Current verify token:", config.webhookVerifyToken);
  console.log("  - Test challenge:", testChallenge);
  
  res.json({
    message: "Webhook endpoint is working",
    webhookUrl: `${config.apiUrl}/webhook`,
    verifyToken: config.webhookVerifyToken,
    testUrl: `${config.apiUrl}/webhook?hub.verify_token=${config.webhookVerifyToken}&hub.challenge=${testChallenge}`,
    instructions: [
      "1. Copy the testUrl above",
      "2. Paste it in your browser",
      "3. You should see the challenge string returned",
      "4. Use the same verifyToken in Meta Developer Console"
    ]
  });
});

export default router;
