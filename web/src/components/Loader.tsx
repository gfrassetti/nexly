"use client";

import Image from "next/image";

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
  showLogo?: boolean;
}

export default function Loader({ 
  size = 'md', 
  text, 
  fullScreen = false, 
  className = '',
  showLogo = true
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const logoSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const LoaderContent = () => (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Spinner principal */}
      <div className="relative">
        {/* Círculo exterior */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-neutral-700`}></div>
        
        {/* Círculo de carga */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-nexly-green border-r-nexly-teal absolute top-0 left-0 animate-spin`}></div>
        
        {/* Logo en el centro */}
        {showLogo && (
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-nexly-green/20 to-nexly-teal/20 absolute top-0 left-0 flex items-center justify-center`}>
            <Image
              src="/logo_single.png"
              alt="Nexly Logo"
              width={24}
              height={24}
              className={`${logoSizeClasses[size]} object-contain`}
            />
          </div>
        )}
      </div>
      
      {/* Texto opcional */}
      {text && (
        <div className="text-center">
          <p className="text-neutral-400 text-sm font-medium">{text}</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="w-1 h-1 bg-nexly-green rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-nexly-teal rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-nexly-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700 shadow-2xl">
          <LoaderContent />
        </div>
      </div>
    );
  }

  return <LoaderContent />;
}

// Loader para páginas específicas
export function PageLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader size="xl" text={text} showLogo={true} />
    </div>
  );
}

// Loader para botones
export function ButtonLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} rounded-full border-2 border-transparent border-t-white animate-spin`}></div>
  );
}

// Loader para tarjetas
export function CardLoader() {
  return (
    <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
        <div className="w-12 h-12 bg-neutral-700 rounded-lg"></div>
      </div>
      <div className="h-8 bg-neutral-700 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-neutral-700 rounded w-1/4"></div>
    </div>
  );
}

// Loader para listas
export function ListLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg border border-neutral-700 animate-pulse">
          <div className="w-2 h-2 bg-neutral-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-3 bg-neutral-700 rounded w-3/4 mb-1"></div>
            <div className="h-2 bg-neutral-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
