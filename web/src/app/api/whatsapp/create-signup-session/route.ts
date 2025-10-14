import { NextRequest, NextResponse } from 'next/server';
import { getCookieToken } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    // Obtener el token de autenticación
    const token = getCookieToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el cuerpo de la petición
    const body = await request.json();
    const { returnUrl, failureUrl } = body;

    if (!returnUrl || !failureUrl) {
      return NextResponse.json(
        { error: 'returnUrl y failureUrl son requeridos' },
        { status: 400 }
      );
    }

    // Hacer la petición al backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/whatsapp/create-signup-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        returnUrl,
        failureUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Error del servidor' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in create-signup-session API route:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
