import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/whatsapp/onboarding-callback
 * 
 * Proxy endpoint para enviar datos de Meta Embedded Signup al backend.
 * Recibe phone_number_id y waba_id del frontend y los envía al backend para
 * crear subaccount y registrar sender.
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Leer los datos del body (phone_number_id y waba_id de Meta)
    const body = await request.json();
    const { phone_number_id, waba_id } = body;

    if (!phone_number_id || !waba_id) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos de Meta Embedded Signup' },
        { status: 400 }
      );
    }

    // Proxear la request al backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/whatsapp/onboarding-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        phone_number_id,
        waba_id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Error en el servidor' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error processing WhatsApp onboarding callback:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando callback' },
      { status: 500 }
    );
  }
}
