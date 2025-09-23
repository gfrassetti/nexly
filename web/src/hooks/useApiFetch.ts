"use client";
import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiFetchReturn<T> extends ApiState<T> {
  fetch: (path: string, options?: RequestInit) => Promise<T>;
  reset: () => void;
}

export function useApiFetch<T = any>(): UseApiFetchReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async (path: string, options?: RequestInit): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiFetch<T>(path, options);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetch,
    reset,
  };
}

// Hook especializado para operaciones que requieren token
export function useAuthenticatedFetch<T = any>(): UseApiFetchReturn<T> {
  const { fetch, ...rest } = useApiFetch<T>();
  
  const authenticatedFetch = useCallback(async (path: string, options?: RequestInit): Promise<T> => {
    // El token se maneja automáticamente en apiFetch
    return fetch(path, options);
  }, [fetch]);

  return {
    ...rest,
    fetch: authenticatedFetch,
  };
}
