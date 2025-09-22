"use client";
import { useState, useMemo } from "react";
import { useContacts } from "@/hooks/useContacts";
import ContactList, { ContactItem } from "@/components/ContactList";
import { deleteContact } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const INTEGRATIONS = [
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "messenger", label: "Messenger", color: "bg-blue-500" },
  { id: "all", label: "Todos", color: "bg-neutral-500" },
];

export default function ContactsPage() {
  const { token } = useAuth();
  const [integrationId, setIntegrationId] = useState("whatsapp");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const { items: contacts, loading, error, refetch } = useContacts(integrationId);

  // Filtrar contactos basado en la búsqueda
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    return contacts.filter((contact: any) => 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  // Función para mostrar notificaciones
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Manejo de errores mejorado
  const handleError = (error: any, context: string) => {
    console.error(`Error en ${context}:`, error);
    const message = error?.response?.data?.message || error?.message || `Error en ${context}`;
    showNotification('error', message);
  };


  async function handleDeleteContact(id: string) {
    if (!token) {
      showNotification('error', 'No tienes permisos para realizar esta acción');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      return;
    }

    setIsDeleting(id);
    try {
      await deleteContact(id, token);
      showNotification('success', 'Contacto eliminado exitosamente');
      refetch();
    } catch (error) {
      handleError(error, 'eliminar contacto');
    } finally {
      setIsDeleting(null);
    }
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

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtro por plataforma */}
          <div className="flex gap-2">
            {INTEGRATIONS.map((integration) => (
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
          <span>Total: {contacts.length} contactos</span>
          {searchQuery && (
            <span>Filtrados: {filteredContacts.length} resultados</span>
          )}
        </div>
      </div>

      {/* Notificaciones */}
      {notification && (
        <div className={`p-4 mx-6 mt-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-900 text-green-100 border border-green-700' :
          notification.type === 'error' ? 'bg-red-900 text-red-100 border border-red-700' :
          'bg-blue-900 text-blue-100 border border-blue-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-neutral-400">Cargando contactos...</p>
            </div>
          </div>
        ) : error ? (
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
            }))}
            onDelete={handleDeleteContact}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </div>
  );
}
