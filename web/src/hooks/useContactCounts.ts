import { useEffect, useState, useCallback } from "react";

export function useContactCounts(integrationId: string = "all") {
  const [counts, setCounts] = useState({ active: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // esto se ejecuta solo en cliente
    const t = localStorage.getItem("token") || "";
    setToken(t);
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("No hay token de autenticación");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construir URL para contactos activos
      const activeParams = new URLSearchParams();
      if (integrationId && integrationId !== "all") {
        activeParams.set("integrationId", integrationId);
      }
      const activeUrl = `/contacts${activeParams.toString() ? `?${activeParams.toString()}` : ""}`;
      
      // Construir URL para contactos archivados
      const archivedParams = new URLSearchParams();
      if (integrationId && integrationId !== "all") {
        archivedParams.set("integrationId", integrationId);
      }
      archivedParams.set("archived", "true");
      const archivedUrl = `/contacts?${archivedParams.toString()}`;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Hacer ambas peticiones en paralelo
      const [activeResponse, archivedResponse] = await Promise.all([
        fetch(`${baseUrl}${activeUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseUrl}${archivedUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (!activeResponse.ok) {
        throw new Error(`Error ${activeResponse.status}: ${activeResponse.statusText}`);
      }
      
      if (!archivedResponse.ok) {
        throw new Error(`Error ${archivedResponse.status}: ${archivedResponse.statusText}`);
      }
      
      const activeData = await activeResponse.json();
      const archivedData = await archivedResponse.json();
      
      // Asegurar que tenemos arrays
      const activeContacts = Array.isArray(activeData) ? activeData : [];
      const archivedContacts = Array.isArray(archivedData) ? archivedData : [];
      
      setCounts({
        active: activeContacts.length,
        archived: archivedContacts.length
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          "No se pudieron cargar los contadores";
      setError(errorMessage);
      setCounts({ active: 0, archived: 0 });
    } finally {
      setLoading(false);
    }
  }, [integrationId, token]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Función para refrescar manualmente
  const refetch = useCallback(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { 
    counts, 
    loading, 
    error, 
    refetch 
  };
}
