"use client";

import Image from "next/image";

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function Loader({ 
  size = 'md', 
  text, 
  fullScreen = false, 
  className = ''
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const logoSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const borderWidth = {
    sm: 'border-2',
    md: 'border-[3px]',
    lg: 'border-4',
    xl: 'border-[5px]'
  };

  const LoaderContent = () => (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Spinner con logo de Nexly */}
      <div className="relative">
        {/* Spinner giratorio con colores Nexly */}
        <div 
          className={`
            ${sizeClasses[size]} 
            ${borderWidth[size]}
            rounded-full 
            border-transparent
            border-t-nexly-green 
            border-r-nexly-teal
            animate-spin
            shadow-2xl
            shadow-nexly-green/30
          `}
          style={{ 
            animationDuration: '1s',
            animationTimingFunction: 'linear'
          }}
        />
        
        {/* Logo en el centro */}
        <div className={`
          ${sizeClasses[size]} 
          rounded-full 
          absolute top-0 left-0 
          flex items-center justify-center
          bg-gradient-to-br from-nexly-green/10 to-nexly-teal/10
        `}>
          <Image
            src="/logo_single.png"
            alt="Nexly"
            width={48}
            height={48}
            className={`${logoSizeClasses[size]} object-contain animate-pulse`}
            priority
          />
        </div>
      </div>
      
      {/* Texto con colores Nexly */}
      {text && (
        <div className="text-center">
          <p className="text-white font-medium text-sm tracking-wide mb-2">
            {text}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-nexly-green rounded-full animate-bounce shadow-lg shadow-nexly-green/50"></div>
            <div className="w-1.5 h-1.5 bg-nexly-teal rounded-full animate-bounce shadow-lg shadow-nexly-teal/50" style={{ animationDelay: '0.15s' }}></div>
            <div className="w-1.5 h-1.5 bg-nexly-green rounded-full animate-bounce shadow-lg shadow-nexly-green/50" style={{ animationDelay: '0.3s' }}></div>
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 backdrop-blur-sm z-50 flex items-center justify-center">
        <LoaderContent />
      </div>
    );
  }

  return <LoaderContent />;
}

// Loader para páginas específicas
export function PageLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
      <Loader size="xl" text={text} />
    </div>
  );
}

// Loader para botones con branding Nexly
export function ButtonLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div 
      className={`
        ${size === 'sm' ? 'w-4 h-4 border-2' : 'w-5 h-5 border-[2.5px]'} 
        rounded-full 
        border-transparent 
        border-t-nexly-green 
        border-r-nexly-teal
        animate-spin
      `}
      style={{ animationDuration: '0.8s' }}
    />
  );
}

// Loader para tarjetas con estilo Nexly
export function CardLoader() {
  return (
    <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 rounded-xl p-6 border border-neutral-700/50 animate-pulse shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gradient-to-r from-neutral-700 to-neutral-600 rounded-full w-1/3"></div>
        <div className="w-10 h-10 bg-gradient-to-br from-nexly-green/20 to-nexly-teal/20 rounded-lg"></div>
      </div>
      <div className="h-7 bg-gradient-to-r from-neutral-700 to-neutral-600 rounded-full w-1/2 mb-3"></div>
      <div className="h-3 bg-neutral-700/70 rounded-full w-1/4"></div>
    </div>
  );
}

// Loader para listas con branding Nexly
export function ListLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-neutral-800/40 to-neutral-900/40 rounded-lg border border-neutral-700/40 animate-pulse"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="w-2 h-2 bg-nexly-green rounded-full shadow-lg shadow-nexly-green/50"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gradient-to-r from-neutral-700 to-neutral-600 rounded-full w-3/4"></div>
            <div className="h-2 bg-neutral-700/70 rounded-full w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Spinner inline con colores Nexly
export function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`w-4 h-4 border-2 border-transparent border-t-nexly-green border-r-nexly-teal rounded-full animate-spin ${className}`}
      style={{ animationDuration: '0.8s' }}
    />
  );
}
