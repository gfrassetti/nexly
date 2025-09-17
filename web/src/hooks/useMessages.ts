"use client";

import { useEffect, useState } from "react";
import { getMessages } from "@/lib/api";

export function useMessages(
  token: string,
  filter: { contactId?: string; provider?: string } = {}
) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getMessages(token, filter);
        if (alive) setItems(data || []);
      } catch (e: any) {
        if (alive) setError(e.message || "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, filter.contactId, filter.provider]);

  return { items, loading, error };
}
