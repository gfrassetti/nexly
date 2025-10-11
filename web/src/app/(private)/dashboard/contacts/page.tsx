"use client";
import { useState, useMemo } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import ContactList, { ContactItem } from "@/components/ContactList";
import { deleteContact } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationHelpers } from "@/hooks/useNotification";
import { useSyncContacts } from "@/hooks/useSyncContacts";
import { INTEGRATIONS } from "@/lib/constants";

const ALL_INTEGRATIONS = [
  ...INTEGRATIONS,
  { id: "all", label: "Todos", color: "bg-neutral-500", description: "Mostrar todos los contactos" },
];

export default function ContactsPage() {
  const { token } = useAuth();
  const { refreshContacts } = useDataRefresh();
  const [integrationId, setIntegrationId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { showSuccess, showError } = useNotificationHelpers();
  const { syncAll, isSyncing, syncProgress } = useSyncContacts();

  const { items: contacts, loading, error, refetch } = useContacts(integrationId);

  // Filtrar contactos basado en la búsqueda y estado de archivado
  const filteredContacts = useMemo(() => {
    // Asegurar que contacts siempre sea un array
    const contactsArray = Array.isArray(contacts) ? contacts : [];
    
    // Filtrar por estado de archivado
    const filteredByArchive = contactsArray.filter((contact: any) => {
      if (showArchived) {
        return contact.status === "archived";
      } else {
        return contact.status !== "archived"; // Mostrar contactos no archivados (incluye "active" y undefined)
      }
    });
    
    // Filtrar por búsqueda
    if (!searchQuery.trim()) return filteredByArchive;
    
    return filteredByArchive.filter((contact: any) => 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery, showArchived]);

  // Manejo de errores mejorado
  const handleError = (error: any, context: string) => {
    console.error(`Error en ${context}:`, error);
    const message = error?.response?.data?.message || error?.message || `Error en ${context}`;
    showError("Error", message);
  };


  async function handleArchiveContact(id: string) {
    if (!token) {
      showError("Error", "No tienes permisos para realizar esta acción");
      return;
    }

    setIsArchiving(id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/contacts/${id}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: true })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      showSuccess("Contacto archivado", result.message || "Contacto archivado exitosamente. Puedes recuperarlo más tarde.");
      refreshContacts();
      refetch();
    } catch (error) {
      handleError(error, 'archivar contacto');
    } finally {
      setIsArchiving(null);
    }
  }

  async function handleSyncContacts() {
    await syncAll(() => {
      refreshContacts();
      refetch();
    });
  }

  function handleMessageContact(contact: any) {
    // Abrir inbox con este contacto específico
    window.location.href = `/dashboard/inbox?contact=${contact.id}`;
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header */}
      <div className="border-b border-neutral-700 bg-neutral-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Contactos</h1>
            <p className="text-neutral-400 mt-1">
              Gestiona tus contactos de todas las plataformas
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* Tabs para contactos activos/archivados */}
            <div className="flex bg-neutral-700 rounded-lg p-1">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  !showArchived 
                    ? "bg-neutral-600 text-white" 
                    : "text-neutral-300 hover:text-white"
                }`}
              >
                Activos ({contacts.filter((c: any) => c.status !== "archived").length})
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  showArchived 
                    ? "bg-neutral-600 text-white" 
                    : "text-neutral-300 hover:text-white"
                }`}
              >
                Archivados ({contacts.filter((c: any) => c.status === "archived").length})
              </button>
            </div>

            <button
              onClick={handleSyncContacts}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {isSyncing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {syncProgress || 'Sincronizando...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sincronizar
                </>
              )}
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard/integrations'}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Conectar Apps
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtro por plataforma */}
          <div className="flex gap-2">
            {ALL_INTEGRATIONS.map((integration) => (
              <button
                key={integration.id}
                onClick={() => setIntegrationId(integration.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-2 ${
                  integrationId === integration.id
                    ? `${integration.color} text-white shadow-lg`
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${integration.color}`}></div>
                {integration.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-2.5 text-neutral-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="flex items-center gap-6 mt-4 text-sm text-neutral-400">
          <span>Total: {Array.isArray(contacts) ? contacts.length : 0} contactos</span>
          {searchQuery && (
            <span>Filtrados: {Array.isArray(filteredContacts) ? filteredContacts.length : 0} resultados</span>
          )}
        </div>
      </div>


      {/* Contenido principal */}
      <div className="flex-1 p-6">
        {error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-400 mb-2">Error al cargar contactos</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => refetch()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <ContactList
            items={filteredContacts.map((c: any) => ({
              id: c._id || c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              integrationId: c.integrationId,
              provider: c.provider,
              avatar: c.avatar,
              profilePicture: c.profilePicture,
              lastInteraction: c.lastInteraction,
              lastMessagePreview: c.lastMessagePreview,
              platformData: c.platformData,
            }))}
            onArchive={handleArchiveContact}
            onMessage={handleMessageContact}
            isArchiving={isArchiving}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
