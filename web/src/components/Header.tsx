"use client";
import Link from "next/link";
import ClientNavigation from "./ClientNavigation";
import { useAuth } from "@/hooks/useAuth";
import Logo from "./Logo";

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
            </Link>
            <Link
              href="/"
              className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-colors duration-300"
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
            <Logo size="lg" showText={false} textClassName="text-xl font-bold" />
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-colors duration-300"
                >
                  Volver a Mi Panel
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
                    href="/pricing"
                    className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-colors duration-300"
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
          <Logo size="lg" />

          {/* Navigation */}
          {isAuthenticated ? (
            <Link
              href="/pricing"
              className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200"
            >
              Elegir Plan
            </Link>
          ) : (
            <ClientNavigation />
          )}
        </div>
      </div>
    </header>
  );
}
