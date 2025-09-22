import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Headers específicos para páginas de pago
      {
        source: '/checkout/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Permitir iframes de MercadoPago
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://www.mercadopago.com.ar https://www.mercadopago.com; script-src 'self' 'unsafe-inline' https://www.mercadopago.com.ar;",
          },
        ],
      },
    ];
  },
  
  // Configuración de redirecciones para seguridad
  async redirects() {
    return [
      // Redireccionar HTTP a HTTPS en producción
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/(.*)',
        has: [
          {
            type: 'header' as const,
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://yourdomain.com/:path*',
        permanent: true,
      }] : []),
    ];
  },
};

export default nextConfig;
