"use client";

import { sendMessageApi } from "@/lib/api";

type Provider = "whatsapp" | "instagram" | "messenger";

// Exactamente uno de los dos: contactId (hilo existente) o to (nuevo destino)
type SendMessagePayload =
  | { provider: Provider; contactId: string; body: string; to?: never }
  | { provider: Provider; to: string; body: string; contactId?: never };

export async function sendMessage(token: string, payload: SendMessagePayload) {
  return sendMessageApi(token, payload);
}
