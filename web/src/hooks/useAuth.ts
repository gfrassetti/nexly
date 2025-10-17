"use client";
import { useState, useEffect } from "react";

type User = { id: string; email: string; username: string } | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos del localStorage al inicializar
  useEffect(() => {
    console.log("🔑 useAuth - Inicializando...");
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    console.log("🔑 useAuth - Datos del localStorage:", { 
      hasToken: !!storedToken, 
      hasUser: !!storedUser,
      token: storedToken ? "***" : "null",
      user: storedUser ? "***" : "null"
    });
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        console.log("🔑 useAuth - Usuario cargado desde localStorage:", parsedUser);
      } catch (error) {
        console.error("🔑 useAuth - Error parseando usuario del localStorage:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    
    setIsLoading(false);
    console.log("🔑 useAuth - Inicialización completada");
  }, []);

  const setAuth = (newToken: string, newUser: NonNullable<User>) => {
    console.log("🔑 useAuth - setAuth llamado:", { token: newToken ? "***" : "null", user: newUser });
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    console.log("🔑 useAuth - setAuth completado");
  };

  const clear = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Función de logout que puede ser llamada manualmente
  const logout = () => {
    console.log('🔄 Logout manual iniciado...');
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
