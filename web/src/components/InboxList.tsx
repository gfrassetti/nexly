"use client";
import { useMemo } from "react";

type Item = {
  id: string;
  title: string;
  last: string;
  at: string;
  unread?: boolean;
  platform?: string;
  avatar?: string;
  // Propiedades adicionales para Telegram
  chatType?: string;
  telegramUsername?: string;
  contactPhone?: string;
};

interface InboxListProps {
  items: Item[];
  activeId: string | null;
  onSelect: (id: string) => void;
  searchQuery?: string;
}

export default function InboxList({ items, activeId, onSelect, searchQuery = "" }: InboxListProps) {
  // Filtrar conversaciones basado en la búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    return items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.last.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // Función para formatear el tiempo
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Ahora";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    } catch {
      return timeString;
    }
  };

  // Función para obtener el avatar del usuario
  const getUserAvatar = (title: string, platform?: string) => {
    // Proteger contra valores undefined/null
    const safeTitle = title || 'Sin nombre';
    const initials = safeTitle
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const platformColors = {
      whatsapp: 'bg-green-500',
      instagram: 'bg-pink-500',
      messenger: 'bg-blue-500',
      telegram: 'bg-blue-400',
    };

    const bgColor = platformColors[platform as keyof typeof platformColors] || 'bg-neutral-500';

    return (
      <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center text-accent-cream font-semibold text-sm`}>
        {initials}
      </div>
    );
  };

  return (
    <>
      {filteredItems.length === 0 ? (
        <div className="p-4 text-center text-neutral-400">
          {searchQuery ? (
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No se encontraron conversaciones</p>
              <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No hay conversaciones</p>
              <p className="text-sm mt-1">Las nuevas conversaciones aparecerán aquí</p>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-700">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`p-4 hover:bg-neutral-700 cursor-pointer transition-colors ${
                activeId === item.id ? "bg-neutral-700 border-r-2 border-green-500" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {getUserAvatar(item.title, item.platform)}
                
                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-accent-cream truncate">{item.title}</h3>
                    <div className="flex items-center gap-2">
                      {item.unread && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      <span className="text-xs text-neutral-400 whitespace-nowrap">
                        {formatTime(item.at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-300 truncate">
                    {item.last}
                  </p>
                  {/* Mostrar información adicional para Telegram */}
                  {item.platform === 'telegram' && item.telegramUsername && (
                    <p className="text-xs text-neutral-500 truncate">
                      @{item.telegramUsername}
                    </p>
                  )}
                  {item.platform === 'telegram' && item.chatType && (
                    <p className="text-xs text-neutral-500 capitalize">
                      {item.chatType}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
