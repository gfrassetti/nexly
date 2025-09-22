"use client";
import Link from "next/link";
import Logo from "./Logo";

interface FooterProps {
  variant?: 'default' | 'minimal';
  showLogo?: boolean;
  showLinks?: boolean;
  className?: string;
}

export default function Footer({ 
  variant = 'default', 
  showLogo = true, 
  showLinks = true,
  className = ""
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer className={`border-t border-neutral-800 bg-neutral-900 py-8 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-neutral-400 text-sm">
            © {currentYear} Nexly. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`border-t border-neutral-800 bg-neutral-900 py-8 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {showLogo && (
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
          )}
          <p className="text-nexly-green font-medium mb-4">
            Unifica tus mensajerías y convierte más clientes.
          </p>
          {showLinks && (
            <div className="flex justify-center space-x-6 text-sm text-neutral-500">
              <Link href="/privacy-policy" className="hover:text-white transition-colors duration-300">
                Política de Privacidad
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-white transition-colors duration-300">
                Términos y Condiciones
              </Link>
              <span>•</span>
              <span>© {currentYear} Nexly. Todos los derechos reservados.</span>
            </div>
          )}
          {!showLinks && (
            <p className="text-neutral-400 text-sm">
              © {currentYear} Nexly. Todos los derechos reservados.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
