"use client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ContactItem = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  integrationId?: string;
  provider?: string;
  avatar?: string;
  profilePicture?: string;
  lastInteraction?: string | Date;
  lastMessagePreview?: string;
  platformData?: {
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
  };
};

interface ContactListProps {
  items: ContactItem[];
  onArchive: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onMessage?: (contact: ContactItem) => void;
  isArchiving?: string | null;
  loading?: boolean;
  showArchived?: boolean;
}

export default function ContactList({
  items,
  onArchive,
  onUnarchive,
  onMessage,
  isArchiving = null,
  loading = false,
  showArchived = false,
}: ContactListProps) {
  const getPlatformIcon = (provider?: string) => {
    switch (provider) {
      case "whatsapp":
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">WA</span>
          </div>
        );
      case "telegram":
        return (
          <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">TG</span>
          </div>
        );
      case "instagram":
        return (
          <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">IG</span>
          </div>
        );
      case "messenger":
        return (
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">M</span>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-neutral-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">?</span>
          </div>
        );
    }
  };

  const formatLastInteraction = (date?: string | Date) => {
    if (!date) return null;

    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
          >
            <div className="flex items-start gap-3">
              {/* Avatar skeleton */}
              <div className="relative flex-shrink-0">
                <Skeleton className="w-12 h-12 rounded-full" />
                {/* Platform badge skeleton */}
                <Skeleton className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full" />
              </div>

              {/* Content skeleton */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Name skeleton */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>

                {/* Username skeleton */}
                <Skeleton className="h-3 w-20" />

                {/* Message preview skeleton */}
                <Skeleton className="h-3 w-32" />

                {/* Phone skeleton */}
                <Skeleton className="h-3 w-28" />
              </div>
            </div>

            {/* Actions skeleton */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-700">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de contactos */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-neutral-400 mb-2">
              No hay contactos aún
            </h3>
            <p className="text-neutral-500 mb-4">
              Los contactos aparecerán automáticamente cuando alguien te escriba
              por primera vez
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
                className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-green-600/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {contact.avatar || contact.profilePicture ? (
                      <img
                        src={contact.avatar || contact.profilePicture}
                        alt={contact.name || "Avatar"}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget
                            .nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{
                        display:
                          contact.avatar || contact.profilePicture
                            ? "none"
                            : "flex",
                      }}
                    >
                      {getInitials(contact.name)}
                    </div>
                    {/* Badge de plataforma */}
                    <div className="absolute -bottom-1 -right-1">
                      {getPlatformIcon(contact.provider)}
                    </div>
                  </div>

                  {/* Información del contacto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {contact.name || "Sin nombre"}
                      </h4>
                      {contact.lastInteraction && (
                        <span className="text-xs text-neutral-500 flex-shrink-0">
                          {formatLastInteraction(contact.lastInteraction)}
                        </span>
                      )}
                    </div>

                    {/* Username de Telegram */}
                    {contact.platformData?.telegramUsername && (
                      <p className="text-xs text-blue-400 mb-1">
                        @{contact.platformData.telegramUsername}
                      </p>
                    )}

                    {/* Preview del último mensaje */}
                    {contact.lastMessagePreview && (
                      <p className="text-sm text-neutral-400 truncate mb-2">
                        {contact.lastMessagePreview}
                      </p>
                    )}

                    {contact.phone && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {contact.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones - Aparecen al hacer hover */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onMessage) {
                        onMessage(contact);
                      } else {
                        // Fallback: abrir inbox con este contacto
                        window.location.href = `/dashboard/inbox?contact=${contact.id}`;
                      }
                    }}
                    className="text-green-500 hover:text-green-400 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Mensaje
                  </button>
                  {showArchived ? (
                    // Botón para desarchivar
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          disabled={isArchiving === contact.id}
                          className="text-green-400 hover:text-green-300 disabled:text-neutral-600 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                          title="Recuperar contacto"
                        >
                          {isArchiving === contact.id ? (
                            <svg
                              className="w-4 h-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                          )}
                          Recuperar
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            🔄 Recuperar contacto
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            El contacto{" "}
                            <strong>
                              {contact.name || contact.phone || "este contacto"}
                            </strong>{" "}
                            volverá a aparecer en la vista principal de
                            contactos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onUnarchive?.(contact.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            Recuperar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    // Botón para archivar
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          disabled={isArchiving === contact.id}
                          className="text-orange-400 hover:text-orange-300 disabled:text-neutral-600 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                          title="Archivar contacto (se puede recuperar más tarde)"
                        >
                          {isArchiving === contact.id ? (
                            <svg
                              className="w-4 h-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 8l4 4-4 4m9-4H9m8 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          Archivar
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            📦 Archivar contacto
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            El contacto{" "}
                            <strong>
                              {contact.name || contact.phone || "este contacto"}
                            </strong>{" "}
                            se ocultará de la vista principal pero podrás
                            recuperarlo más tarde desde la sección de contactos
                            archivados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onArchive(contact.id)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            Archivar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
