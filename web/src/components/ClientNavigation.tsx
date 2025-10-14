"use client";
import Link from "next/link";
import { useState } from "react";

export default function ClientNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        <a href="#features" className="text-neutral-300 hover:text-accent-cream transition-colors">
          Producto
        </a>
        <Link href="/pricing" className="text-neutral-300 hover:text-accent-cream transition-colors">
          Precios
        </Link>
      </div>

      {/* Auth Buttons */}
      <div className="hidden md:flex items-center space-x-4">
        <Link
          href="/login"
          className="text-neutral-300 hover:text-accent-cream transition-colors duration-300"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/pricing"
          className="bg-nexly-teal hover:bg-nexly-green text-accent-cream px-4 py-2 rounded-lg transition-colors duration-300"
        >
          Probar gratis
        </Link>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-neutral-300 hover:text-accent-cream transition-colors duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-accent-dark">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a href="#features" className="block px-3 py-2 text-neutral-300 hover:text-accent-cream">
              Producto
            </a>
            <Link href="/pricing" className="block px-3 py-2 text-neutral-300 hover:text-accent-cream">
              Precios
            </Link>
            <div className="border-t border-neutral-800 pt-2 mt-2">
              <Link href="/login" className="block px-3 py-2 text-neutral-300 hover:text-accent-cream">
                Iniciar sesión
              </Link>
              <Link href="/pricing" className="block px-3 py-2 text-nexly-teal hover:text-nexly-green">
                Probar gratis
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
