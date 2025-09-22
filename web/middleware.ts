import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function middleware(req: NextRequest) {
  const isApp = req.nextUrl.pathname.startsWith("/dashboard");
  const isCheckout = req.nextUrl.pathname.startsWith("/checkout");
  
  // Solo proteger rutas que requieren autenticación
  if (!isApp && !isCheckout) return NextResponse.next();
  
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Verificar JWT en el middleware
    jwt.verify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    // Token inválido o expirado
    console.warn(`Invalid token from IP: ${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`);
    
    // Limpiar cookie inválida
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    
    return response;
  }
}

export const config = { 
  matcher: ["/dashboard/:path*", "/checkout/:path*"] 
};
