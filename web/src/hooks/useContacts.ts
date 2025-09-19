import { useEffect, useState } from "react";
import { getContacts } from "@/lib/api";

export function useContacts(integrationId: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // esto se ejecuta solo en cliente
    const t = localStorage.getItem("token") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No token en localStorage");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getContacts()
      .then((data) => {
        if (!mounted) return;
        console.log("[useContacts] contactos recibidos:", data);
        const filtered = integrationId
          ? data.filter((c: any) => c.integrationId === integrationId)
          : data;
        setItems(filtered);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "No se pudieron cargar los contactos");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [integrationId, token]);

  return { items, loading, error };
}
