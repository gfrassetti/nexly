import { useEffect, useState, useCallback } from "react";
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

  const fetchContacts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("No hay token de autenticación");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getContacts(token);
      
      // Filtrar por integración si no es "all"
      const filtered = integrationId && integrationId !== "all"
        ? data.filter((c: any) => c.integrationId === integrationId)
        : data;
      
      setItems(filtered);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          "No se pudieron cargar los contactos";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [integrationId, token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Función para refrescar manualmente
  const refetch = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { 
    items, 
    loading, 
    error, 
    refetch 
  };
}
