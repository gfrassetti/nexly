import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const envVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✅ Configurado" : "❌ Faltante",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✅ Configurado" : "❌ Faltante",
    FRONTEND_URL: process.env.FRONTEND_URL || "❌ Faltante",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "❌ Faltante (usando FRONTEND_URL)",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ Configurado" : "❌ Faltante",
    MONGODB_URI: process.env.MONGODB_URI ? "✅ Configurado" : "❌ Faltante",
  }

  return NextResponse.json({
    message: "Debug de NextAuth",
    environment: envVars,
    timestamp: new Date().toISOString(),
  })
}
