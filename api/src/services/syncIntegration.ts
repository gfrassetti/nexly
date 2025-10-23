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

  if (integration.provider === "instagram") {
    return await syncInstagram(integration);
  }

  if (integration.provider === "messenger") {
    // TODO: implementar sincronización para Messenger
    return { ok: true, note: "sync for Messenger pendiente" };
  }

  // Discord removido - no es posible acceder a conversaciones del usuario

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

async function syncInstagram(integration: IntegrationDoc) {
  if (!integration.externalId || !integration.accessToken) {
    return { ok: false, error: "missing_externalId_or_accessToken" };
  }

  try {
    // 🔎 Validar perfil de Instagram Business
    const url = `https://graph.facebook.com/v19.0/${integration.externalId}`;
    const res = await axios.get(url, {
      params: { 
        fields: "id,username,name,profile_picture_url,followers_count,media_count",
        access_token: integration.accessToken
      },
      timeout: 10000,
    });

    // Actualizar integración con metadata
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          meta: {
            username: res.data?.username,
            name: res.data?.name,
            profilePicture: res.data?.profile_picture_url,
            followersCount: res.data?.followers_count,
            mediaCount: res.data?.media_count,
          },
          status: "linked",
        },
      }
    );

    return { ok: true, profile: res.data };
  } catch (err: any) {
    console.error("syncInstagram failed:", err?.response?.data || err?.message);
    
    // Marcar como error si falla la sincronización
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          status: "error",
          meta: {
            error: err?.response?.data?.error?.message || err?.message || "Sync failed"
          }
        },
      }
    );
    
    return { ok: false, error: "sync_failed" };
  }
}

// Discord removido - no es posible acceder a conversaciones del usuario
