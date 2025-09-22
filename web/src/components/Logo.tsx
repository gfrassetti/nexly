import Link from "next/link";

interface LogoProps {
  href?: string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ 
  href = "/", 
  className = "",
  showText = false,
  textClassName = "text-xl font-bold",
  size = 'md'
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const logoSizeClasses = {
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-40'
  };

  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${logoSizeClasses[size]} flex items-center justify-center`}>
        <img 
          src="/logo_nexly.png" 
          alt="Nexly Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <span className={`${textClassName}`}>
          Nexly
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block hover:opacity-80 transition-opacity duration-300">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
