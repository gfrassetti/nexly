import axios from "axios";
import { Integration, IntegrationDoc } from "../models/Integration";
import { Contact } from "../models/Contact";
import { Message } from "../models/Message";

/**
 * Sincroniza una integración con el proveedor externo.
 * - WhatsApp Cloud API: solo valida que funcione y guarda metadata.
 * - Instagram/Messenger: podrías extenderlo para traer conversaciones iniciales.
 */
export async function syncIntegration(integration: IntegrationDoc) {
  if (integration.provider === "whatsapp") {
    return await syncWhatsApp(integration);
  }

  if (integration.provider === "instagram" || integration.provider === "messenger") {
    // TODO: usar Graph API para traer conversaciones iniciales si es necesario
    return { ok: true, note: "sync for IG/Messenger pendiente" };
  }

  return { ok: true };
}

async function syncWhatsApp(integration: IntegrationDoc) {
  if (!integration.phoneNumberId || !integration.accessToken) {
    return { ok: false, error: "missing_phoneNumberId_or_accessToken" };
  }

  try {
    // 🔎 Validar perfil del número
    const url = `https://graph.facebook.com/v19.0/${integration.phoneNumberId}`;
    const res = await axios.get(url, {
      params: { fields: "id,display_phone_number,verified_name" },
      headers: { Authorization: `Bearer ${integration.accessToken}` },
      timeout: 10000,
    });

    // Actualizar integración con metadata
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          meta: {
            displayPhone: res.data?.display_phone_number,
            verifiedName: res.data?.verified_name,
          },
          status: "linked",
        },
      }
    );

    // ⚠️ Nota: WhatsApp Cloud API no permite descargar historial de chats.
    // Los contactos/mensajes se llenarán con el webhook a partir de ahora.

    return { ok: true, profile: res.data };
  } catch (err: any) {
    console.error("syncWhatsApp failed:", err?.response?.data || err?.message);
    return { ok: false, error: "sync_failed" };
  }
}
