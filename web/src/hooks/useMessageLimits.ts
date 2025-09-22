// web/src/hooks/useMessageLimits.ts
"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";

interface MessageLimit {
  provider: string;
  maxMessages: number;
  usedToday: number;
  remaining: number;
  canSend: boolean;
}

interface MessageLimitsResponse {
  limits: MessageLimit[];
}

export function useMessageLimits(token: string | null) {
  const { data, error, mutate } = useSWR<MessageLimitsResponse>(
    token ? ["/messages/limits", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Failed to fetch limits");
      return res.json();
    }
  );

  const getLimitForProvider = (provider: string): MessageLimit | null => {
    if (!data?.limits) return null;
    return data.limits.find(limit => limit.provider === provider) || null;
  };

  const canSendMessage = (provider: string): boolean => {
    const limit = getLimitForProvider(provider);
    return limit ? limit.canSend : true;
  };

  const getRemainingMessages = (provider: string): number => {
    const limit = getLimitForProvider(provider);
    return limit ? limit.remaining : 999;
  };

  const getUsedMessages = (provider: string): number => {
    const limit = getLimitForProvider(provider);
    return limit ? limit.usedToday : 0;
  };

  const getMaxMessages = (provider: string): number => {
    const limit = getLimitForProvider(provider);
    return limit ? limit.maxMessages : 999;
  };

  return {
    limits: data?.limits || [],
    loading: !data && !error,
    error,
    refetch: mutate,
    getLimitForProvider,
    canSendMessage,
    getRemainingMessages,
    getUsedMessages,
    getMaxMessages,
  };
}
