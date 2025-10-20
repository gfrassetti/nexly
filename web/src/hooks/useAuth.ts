"use client";
import { useState, useEffect } from "react";

type User = { id: string; email: string; username: string } | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos del localStorage al inicializar
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const setAuth = (newToken: string, newUser: NonNullable<User>) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const clear = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Función de logout que puede ser llamada manualmente
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    sessionStorage.clear();
    window.location.replace("/login");
  };

  return {
    user,
    token,
    setAuth,
    clear,
    logout,
    isLoading,
    isAuthenticated: !!token && !!user,
  };
}
