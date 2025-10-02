import { Router, Request, Response } from "express";
import { config } from "../config";
import logger from "../utils/logger";

const router = Router();

// Verificación del webhook (GET) - Según documentación de Meta
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Webhook verification request:", {
    mode,
    token,
    challenge: challenge ? "present" : "missing"
  });

  if (mode === "subscribe" && token === config.webhookVerifyToken) {
    console.log("✅ Webhook verificado correctamente");
    logger.info('Webhook verification successful', {
      mode,
      token: token ? 'present' : 'missing',
      challenge: challenge ? 'present' : 'missing'
    });
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verificación fallida:", {
      mode,
      expectedToken: config.webhookVerifyToken,
      receivedToken: token
    });
    logger.error('Webhook verification failed', {
      mode,
      expectedToken: config.webhookVerifyToken,
      receivedToken: token
    });
    res.status(403).send("Forbidden");
  }
});

// Notificaciones de mensajes (POST) - Según documentación de Meta
router.post("/", (req: Request, res: Response) => {
  console.log("📨 Webhook recibido:", JSON.stringify(req.body, null, 2));
  
  logger.info('Webhook notification received', {
    body: req.body,
    headers: req.headers
  });
  
  // Procesar notificaciones de WhatsApp según la documentación
  const body = req.body;
  
  if (body.object === "whatsapp_business_account") {
    body.entry?.forEach((entry: any) => {
      entry.changes?.forEach((change: any) => {
        if (change.field === "messages") {
          console.log("💬 Mensaje recibido:", change.value);
          
          // Procesar mensajes según la documentación
          const messages = change.value?.messages || [];
          const contacts = change.value?.contacts || [];
          const metadata = change.value?.metadata || {};
          
          messages.forEach((message: any) => {
            console.log("📱 Procesando mensaje:", {
              id: message.id,
              from: message.from,
              type: message.type,
              timestamp: message.timestamp,
              text: message.text?.body
            });
          });
        }
      });
    });
  }
  
  res.status(200).send("OK");
});

export default router;