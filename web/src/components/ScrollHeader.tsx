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
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <img src="/logo_single.png" alt="Nexly" className="w-8 h-8" />
              <span className="text-xl font-bold text-accent-cream">Nexly</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/#features" className="text-neutral-300 hover:text-accent-cream transition-colors">
              Producto
            </Link>
            <Link href="/pricing" className="text-neutral-300 hover:text-accent-cream transition-colors">
              Precios
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <div className="flex items-center space-x-2 text-neutral-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>

            {token ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-neutral-300 hover:text-accent-cream transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-neutral-300 hover:text-accent-cream transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/login" 
                  className="text-neutral-300 hover:text-accent-cream transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="bg-nexly-teal text-accent-cream px-4 py-2 rounded-lg hover:bg-nexly-teal/90 transition-colors"
                >
                  Prueba Gratis
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
