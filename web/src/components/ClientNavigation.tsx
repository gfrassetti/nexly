"use client";
import { useState } from "react";
import Link from "next/link";

export default function ClientNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        <a href="#features" className="text-neutral-300 hover:text-white transition-colors">
          Características
        </a>
        <Link href="/pricing" className="text-neutral-300 hover:text-white transition-colors">
          Precios
        </Link>
        <a href="#contact" className="text-neutral-300 hover:text-white transition-colors">
          Contacto
        </a>
      </div>

      {/* Auth Buttons */}
      <div className="hidden md:flex items-center space-x-4">
        <Link
          href="/login"
          className="text-neutral-300 hover:text-white transition-colors"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Probar gratis
        </Link>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-neutral-300 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a href="#features" className="block px-3 py-2 text-neutral-300 hover:text-white">
              Características
            </a>
            <Link href="/pricing" className="block px-3 py-2 text-neutral-300 hover:text-white">
              Precios
            </Link>
            <a href="#contact" className="block px-3 py-2 text-neutral-300 hover:text-white">
              Contacto
            </a>
            <div className="border-t border-neutral-800 pt-2 mt-2">
              <Link href="/login" className="block px-3 py-2 text-neutral-300 hover:text-white">
                Iniciar sesión
              </Link>
              <Link href="/register" className="block px-3 py-2 text-green-400 hover:text-green-300">
                Probar gratis
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
