import { useEffect, useState, useCallback } from "react";

export function useContacts(integrationId: string, showArchived: boolean = false, getCounts: boolean = false) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [counts, setCounts] = useState({ active: 0, archived: 0 });

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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      if (getCounts) {
        // Obtener contactos activos y archivados en paralelo para contadores
        const activeParams = new URLSearchParams();
        if (integrationId) {
          activeParams.set("integrationId", integrationId);
        }
        const activeUrl = `/contacts${activeParams.toString() ? `?${activeParams.toString()}` : ""}`;
        
        const archivedParams = new URLSearchParams();
        if (integrationId) {
          archivedParams.set("integrationId", integrationId);
        }
        archivedParams.set("archived", "true");
        const archivedUrl = `/contacts?${archivedParams.toString()}`;
        
        const [activeResponse, archivedResponse] = await Promise.all([
          fetch(`${baseUrl}${activeUrl}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${baseUrl}${archivedUrl}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        if (!activeResponse.ok || !archivedResponse.ok) {
          throw new Error(`Error en peticiones de contadores`);
        }
        
        const activeData = await activeResponse.json();
        const archivedData = await archivedResponse.json();
        
        const activeContacts = Array.isArray(activeData) ? activeData : [];
        const archivedContacts = Array.isArray(archivedData) ? archivedData : [];
        
        setCounts({
          active: activeContacts.length,
          archived: archivedContacts.length
        });
      }
      
      // Obtener contactos según el filtro actual
      const params = new URLSearchParams();
      if (integrationId) {
        params.set("integrationId", integrationId);
      }
      if (showArchived) {
        params.set("archived", "true");
      }
      
      const url = `/contacts${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(`${baseUrl}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Asegurarse de que tenemos un array
      let contacts = Array.isArray(data) ? data : [];
      
      // DEBUG: Log para verificar datos del backend
      console.log('useContacts debug:', {
        integrationId,
        showArchived,
        responseStatus: response.status,
        rawData: data,
        contactsCount: contacts.length,
        contacts: contacts.slice(0, 2) // Solo los primeros 2
      });
      
      setItems(contacts);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          "No se pudieron cargar los contactos";
      setError(errorMessage);
      setItems([]); // Asegurar que items sea un array vacío en caso de error
      setCounts({ active: 0, archived: 0 });
    } finally {
      setLoading(false);
    }
  }, [integrationId, token, showArchived, getCounts]);

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
    refetch,
    counts: getCounts ? counts : undefined
  };
}
