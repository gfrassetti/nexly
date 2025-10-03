"use client";
import { useCallback } from "react";
import { mutate } from "swr";

/**
 * Hook global para refrescar todos los datos de la aplicación
 */
export function useDataRefresh() {
  const refreshAll = useCallback(() => {
    // Refrescar integraciones
    mutate((key) => Array.isArray(key) && key[0] === "/integrations");
    
    // Refrescar contactos
    mutate((key) => Array.isArray(key) && key[0] === "/contacts");
    
    // Refrescar inbox
    mutate((key) => Array.isArray(key) && key[0] === "/inbox");
    
    // Refrescar mensajes
    mutate((key) => Array.isArray(key) && key[0] === "/messages");
    
    // Refrescar conversaciones
    mutate((key) => Array.isArray(key) && key[0] === "/conversations");
  }, []);

  const refreshIntegrations = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "/integrations");
  }, []);

  const refreshContacts = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "/contacts");
  }, []);

  const refreshInbox = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "/inbox");
  }, []);

  const refreshMessages = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "/messages");
  }, []);

  const refreshConversations = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "/conversations");
  }, []);

  return {
    refreshAll,
    refreshIntegrations,
    refreshContacts,
    refreshInbox,
    refreshMessages,
    refreshConversations,
  };
}
