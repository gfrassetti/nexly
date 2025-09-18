"use client";

import { sendMessageApi } from "@/lib/api";

type Provider = "whatsapp" | "instagram" | "messenger";

type SendMessagePayload =
  | { provider: Provider; contactId: string; body: string; to?: string }
  | { provider: Provider; to: string; body: string; contactId?: string };

export async function sendMessage(token: string, payload: SendMessagePayload) {
  return sendMessageApi(token, {
    provider: payload.provider,
    body: payload.body,
    contactId: payload.contactId,
    to: payload.to ?? "", // asegurar string, aunque sea vacío
  });
}
