"use client";
import Link from "next/link";
import ClientNavigation from "./ClientNavigation";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  variant?: 'default' | 'auth' | 'simple';
  title?: string;
  showBackButton?: boolean;
  className?: string;
}

export default function Header({ 
  variant = 'default', 
  title,
  showBackButton = false,
  className = ""
}: HeaderProps) {
  const { isAuthenticated } = useAuth();

  if (variant === 'auth') {
    return (
      <header className={`border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-nexly-teal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold">Nexly</span>
            </Link>
            <Link
              href="/"
              className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>
    );
  }

  if (variant === 'simple') {
    return (
      <header className={`border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-nexly-teal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold">Nexly</span>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/" className="text-neutral-300 hover:text-white transition-colors duration-300">
                    Volver al inicio
                  </Link>
                  <Link href="/login" className="text-neutral-300 hover:text-white transition-colors duration-300">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Default variant (HomePage)
  return (
    <header className={`border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-40 p-2 flex items-center justify-center">
                <img 
                  src="/logo_nexly.png" 
                  alt="Nexly Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200"
            >
              Ir al Dashboard
            </Link>
          ) : (
            <ClientNavigation />
          )}
        </div>
      </div>
    </header>
  );
}
