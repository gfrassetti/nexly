import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface DashboardStats {
  activeIntegrations: number;
  unreadMessages: number;
}

export function useStats() {
  const [stats, setStats] = useState<DashboardStats>({
    activeIntegrations: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener estadísticas desde el backend
        console.log("Fetching stats from /analytics/dashboard...");
        
        // Define una interfaz para la respuesta con 'data'
        interface ApiResponse {
            success: boolean;
            data: DashboardStats;
            error?: string;
        }

        const response = await apiFetch<ApiResponse>("/analytics/dashboard");
        
        
        // Extraer las stats de la propiedad 'data'
        if (response.success) {
          setStats(response.data);
        } else {
          throw new Error(response.error || 'Error en la respuesta');
        }
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError(err.message || "Error al cargar estadísticas");
        
        // Mantener valores por defecto en caso de error
        setStats({
          activeIntegrations: 0,
          unreadMessages: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
