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

  if (integration.provider === "discord") {
    return await syncDiscord(integration);
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

async function syncDiscord(integration: IntegrationDoc) {
  if (!integration.accessToken || !integration.meta?.discordBotToken) {
    return { ok: false, error: "missing_discord_bot_token" };
  }

  try {
    // 🔎 Validar bot de Discord y obtener información del servidor
    const botUrl = `https://discord.com/api/v10/users/@me`;
    const guildUrl = `https://discord.com/api/v10/guilds/${integration.externalId}`;
    
    const [botRes, guildRes] = await Promise.all([
      axios.get(botUrl, {
        headers: { Authorization: `Bot ${integration.meta.discordBotToken}` },
        timeout: 10000,
      }),
      axios.get(guildUrl, {
        headers: { Authorization: `Bot ${integration.meta.discordBotToken}` },
        timeout: 10000,
      }).catch(() => ({ data: null })) // El servidor puede no existir o no tener permisos
    ]);

    // Actualizar integración con metadata
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          meta: {
            ...integration.meta,
            botUsername: botRes.data?.username,
            botId: botRes.data?.id,
            guildName: guildRes.data?.name,
            guildMemberCount: guildRes.data?.member_count,
            guildIcon: guildRes.data?.icon,
          },
          status: "linked",
        },
      }
    );

    return { ok: true, profile: { bot: botRes.data, guild: guildRes.data } };
  } catch (err: any) {
    console.error("syncDiscord failed:", err?.response?.data || err?.message);
    
    // Marcar como error si falla la sincronización
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          status: "error",
          meta: {
            ...integration.meta,
            error: err?.response?.data?.message || err?.message || "Discord sync failed"
          }
        },
      }
    );
    
    return { ok: false, error: "sync_failed" };
  }
}
