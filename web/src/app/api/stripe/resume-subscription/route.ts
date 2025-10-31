import { NextRequest, NextResponse } from 'next/server';

// Este endpoint actúa como proxy al backend de Express
export async function PUT(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nexly-production.up.railway.app';
    const body = await request.json();
    
    // Obtener token de autenticación desde headers (el frontend lo envía)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    // Forward the request to the Express backend
    // El router está montado en /stripe/pause y el endpoint es /resume, entonces la ruta completa es /stripe/pause/resume
    const response = await fetch(`${backendUrl}/stripe/pause/resume`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in resume-subscription proxy:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

