"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';

export default function ScrollHeader() {
  const { token, user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] p-2 w-full">
      <div className={clsx(
        'mx-auto max-w-[1320px] transition-all duration-400',
        isScrolled 
          ? 'border border-grey-800 rounded-lg bg-neutral-800 shadow-md' 
          : 'border border-transparent ease-[cubic-bezier(1,.01,1,.25)]'
      )}>
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2">
              <img src="/logo_single.png" alt="Nexly" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-lg sm:text-xl font-bold text-accent-cream">Nexly</span>
            </Link>
          </div>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link href="/#features" className="text-neutral-300 hover:text-accent-cream transition-colors text-sm lg:text-base">
              Producto
            </Link>
            <Link href="/pricing" className="text-neutral-300 hover:text-accent-cream transition-colors text-sm lg:text-base">
              Precios
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language selector - Hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-2 text-neutral-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>

            {token ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-neutral-300 hover:text-accent-cream transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Link>
                <button
                  onClick={logout}
                  className="text-neutral-300 hover:text-accent-cream transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link 
                  href="/login" 
                  className="text-neutral-300 hover:text-accent-cream transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Iniciar Sesión</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </Link>
                <Link
                  href="/register"
                  className="bg-nexly-teal text-accent-cream px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-nexly-teal/90 transition-colors text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Prueba Gratis</span>
                  <span className="sm:hidden">Gratis</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
