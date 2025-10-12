import useSWR from "swr";
import { useAuth } from "./useAuth";
import { useMemo } from "react";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(`${baseUrl}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export function useContacts(integrationId: string, showArchived: boolean = false, getCounts: boolean = false) {
  const { token } = useAuth();

  // Construir la key para SWR
  const params = new URLSearchParams();
  if (integrationId) {
    params.set("integrationId", integrationId);
  }
  if (showArchived) {
    params.set("archived", "true");
  }
  const contactsKey = token ? `/contacts${params.toString() ? `?${params.toString()}` : ""}` : null;

  // Keys para los contadores
  const activeParams = new URLSearchParams();
  if (integrationId) {
    activeParams.set("integrationId", integrationId);
  }
  const activeKey = token && getCounts ? `/contacts${activeParams.toString() ? `?${activeParams.toString()}` : ""}` : null;

  const archivedParams = new URLSearchParams();
  if (integrationId) {
    archivedParams.set("integrationId", integrationId);
  }
  archivedParams.set("archived", "true");
  const archivedKey = token && getCounts ? `/contacts?${archivedParams.toString()}` : null;

  // Fetch principal de contactos con caché optimizado
  const { data: contacts, error: contactsError, isLoading: contactsLoading, mutate } = useSWR(
    contactsKey,
    (url) => fetcher(url, token!),
    {
      revalidateOnFocus: false, // No revalidar al volver al tab
      revalidateOnReconnect: true, // Revalidar al reconectar
      dedupingInterval: 30000, // Deduplicar requests por 30 segundos
      refreshInterval: 60000, // Refrescar automáticamente cada 60 segundos
      keepPreviousData: true, // Mantener datos anteriores mientras carga
      fallbackData: [], // Datos por defecto
    }
  );

  // Fetch de contadores (solo si getCounts es true)
  const { data: activeContacts, mutate: mutateActive } = useSWR(
    activeKey,
    (url) => fetcher(url, token!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache más largo para contadores
      fallbackData: [],
    }
  );

  const { data: archivedContacts, mutate: mutateArchived } = useSWR(
    archivedKey,
    (url) => fetcher(url, token!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      fallbackData: [],
    }
  );

  // Calcular counts
  const counts = useMemo(() => {
    if (!getCounts) return undefined;
    return {
      active: Array.isArray(activeContacts) ? activeContacts.length : 0,
      archived: Array.isArray(archivedContacts) ? archivedContacts.length : 0,
    };
  }, [getCounts, activeContacts, archivedContacts]);

  // Normalizar los datos
  const items = useMemo(() => {
    return Array.isArray(contacts) ? contacts : [];
  }, [contacts]);

  const error = contactsError ? (contactsError.message || "No se pudieron cargar los contactos") : null;

  // Función para refetch todos los cachés (lista + contadores)
  const refetchAll = async () => {
    await Promise.all([
      mutate(), // Refetch lista principal
      getCounts ? mutateActive() : Promise.resolve(), // Refetch contador activos
      getCounts ? mutateArchived() : Promise.resolve(), // Refetch contador archivados
    ]);
  };

  return {
    items,
    loading: contactsLoading,
    error,
    refetch: mutate,
    refetchAll, // Nueva función que refetch todos los cachés
    counts,
  };
}
