"use client";

import { useState, useCallback } from 'react';

interface UseLoaderReturn {
  isLoading: boolean;
  startLoading: (text?: string) => void;
  stopLoading: () => void;
  loadingText: string;
}

export function useLoader(initialText: string = 'Cargando...'): UseLoaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(initialText);

  const startLoading = useCallback((text?: string) => {
    if (text) {
      setLoadingText(text);
    }
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    loadingText
  };
}

// Hook para loading de botones
export function useButtonLoader() {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading
  };
}
