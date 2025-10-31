/**
 * SECURITY: Next.js API Route que actúa como proxy seguro.
 * ⚠️ IMPORTANTE: Este endpoint NO usa el AuthToken de Twilio directamente.
 * 
 * Flujo:
 * 1. Recibe request del frontend
 * 2. Envía request al backend Express (que tiene el AuthToken)
 * 3. Backend genera URL de Twilio y la devuelve
 * 4. Este endpoint devuelve la URL al frontend
 * 
 * El AuthToken de Twilio NUNCA se expone al frontend.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Obtener el token de autenticación desde las cookies
    const token = request.cookies.get('token')?.value;
    
    console.log('WhatsApp signup request received');
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('No token found in cookies');
      return NextResponse.json(
        { error: 'No autorizado - token no encontrado' },
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
    const backendEndpoint = `${backendUrl}/whatsapp/create-signup-session`;
    
    console.log('Making request to backend:', backendEndpoint);
    console.log('Request payload:', { returnUrl, failureUrl });
    
    const response = await fetch(backendEndpoint, {
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

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
      console.log('Backend error:', errorData);
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
