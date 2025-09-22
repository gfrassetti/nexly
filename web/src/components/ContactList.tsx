"use client";
import { useState, useEffect } from "react";

export type ContactItem = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  integrationId?: string;
};

interface ContactListProps {
  items: ContactItem[];
  onDelete: (id: string) => void;
  isDeleting?: string | null;
}

export default function ContactList({
  items,
  onDelete,
  isDeleting = null,
}: ContactListProps) {

  const getPlatformIcon = (integrationId?: string) => {
    switch (integrationId) {
      case 'whatsapp':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">WA</span>
          </div>
        );
      case 'instagram':
        return (
          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">IG</span>
          </div>
        );
      case 'messenger':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">MSG</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-neutral-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">?</span>
          </div>
        );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">

      {/* Lista de contactos */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-neutral-400 mb-2">No hay contactos aún</h3>
            <p className="text-neutral-500 mb-4">
              Los contactos aparecerán automáticamente cuando alguien te escriba por primera vez
            </p>
            <div className="text-sm text-neutral-600 space-y-1">
              <p>📱 WhatsApp: Cuando alguien te envíe un mensaje</p>
              <p>📸 Instagram: Cuando recibas un DM</p>
              <p>💬 Messenger: Cuando alguien te contacte</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((contact) => (
              <div
                key={contact.id}
                className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-neutral-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-neutral-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {getInitials(contact.name)}
                  </div>

                  {/* Información del contacto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {contact.name || 'Sin nombre'}
                      </h4>
                      {getPlatformIcon(contact.integrationId)}
                    </div>
                    
                    {contact.phone && (
                      <p className="text-sm text-neutral-300 mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {contact.phone}
                      </p>
                    )}
                    
                    {contact.email && (
                      <p className="text-sm text-neutral-300 flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {contact.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex justify-end mt-4 pt-4 border-t border-neutral-700">
                  <button
                    onClick={() => onDelete(contact.id)}
                    disabled={isDeleting === contact.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeleting === contact.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {isDeleting === contact.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
