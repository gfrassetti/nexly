import { useState } from "react";
import { syncAllContacts, syncIntegrationContacts } from "@/lib/api";
import { useAuth } from "./useAuth";
import { useNotificationHelpers } from "./useNotification";

interface SyncResult {
  success: boolean;
  provider: string;
  contactsSynced: number;
  contactsCreated: number;
  contactsUpdated: number;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  results?: SyncResult[];
  result?: SyncResult;
  summary?: {
    totalSynced: number;
    totalCreated: number;
    totalUpdated: number;
  };
}

export function useSyncContacts() {
  const { token } = useAuth();
  const { showSuccess, showError } = useNotificationHelpers();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  /**
   * Sincronizar todos los contactos
   */
  const syncAll = async (onComplete?: () => void) => {
    if (!token) {
      showError("Error", "No estás autenticado");
      return null;
    }

    setIsSyncing(true);
    setSyncProgress("Sincronizando contactos...");

    try {
      const response = await syncAllContacts(token);

      if (response.success) {
        const { totalSynced, totalCreated, totalUpdated } = response.summary || {
          totalSynced: 0,
          totalCreated: 0,
          totalUpdated: 0,
        };

        showSuccess(
          "Sincronización completada",
          `${totalSynced} contactos sincronizados (${totalCreated} nuevos, ${totalUpdated} actualizados)`
        );

        if (onComplete) onComplete();
        return response;
      } else {
        showError("Error", response.message || "Error al sincronizar contactos");
        return response;
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error al sincronizar contactos";
      showError("Error", errorMessage);
      return null;
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  /**
   * Sincronizar contactos de una integración específica
   */
  const syncIntegration = async (integrationId: string, onComplete?: () => void) => {
    if (!token) {
      showError("Error", "No estás autenticado");
      return null;
    }

    setIsSyncing(true);
    setSyncProgress("Sincronizando integración...");

    try {
      const response = await syncIntegrationContacts(integrationId, token);

      if (response.success && response.result) {
        const { contactsSynced, contactsCreated, contactsUpdated, provider } = response.result;

        showSuccess(
          "Sincronización completada",
          `${contactsSynced} contactos de ${provider} sincronizados (${contactsCreated} nuevos, ${contactsUpdated} actualizados)`
        );

        if (onComplete) onComplete();
        return response;
      } else {
        showError("Error", response.message || "Error al sincronizar integración");
        return response;
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error al sincronizar integración";
      showError("Error", errorMessage);
      return null;
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  return {
    syncAll,
    syncIntegration,
    isSyncing,
    syncProgress,
  };
}

