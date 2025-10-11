import { useEffect, useState, useCallback } from "react";

export function useContacts(integrationId: string, showArchived: boolean = false) {
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
      // Construir URL con parámetros
      const params = new URLSearchParams();
      if (integrationId && integrationId !== "all") {
        params.set("integrationId", integrationId);
      }
      if (showArchived) {
        params.set("archived", "true");
      }
      
      const url = `/contacts${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Asegurarse de que tenemos un array
      let contacts = Array.isArray(data) ? data : [];
      
      setItems(contacts);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          "No se pudieron cargar los contactos";
      setError(errorMessage);
      setItems([]); // Asegurar que items sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }, [integrationId, token, showArchived]);

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
