"use client";

import { sendMessageApi } from "@/lib/api";

type Provider = "whatsapp" | "instagram" | "messenger" | "telegram" | "tiktok";

type SendMessagePayload =
  | { provider: Provider; contactId: string; body: string; to?: string }
  | { provider: Provider; to: string; body: string; contactId?: string };

export async function sendMessage(_token: string, payload: SendMessagePayload) {
  return sendMessageApi({
    provider: payload.provider,
    body: payload.body,
    contactId: payload.contactId,
    to: payload.to ?? "",
  });
}
