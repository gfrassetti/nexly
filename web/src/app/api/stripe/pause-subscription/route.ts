import { NextRequest, NextResponse } from 'next/server';

// Este endpoint actúa como proxy al backend de Express
export async function PUT(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const body = await request.json();
    
    // Forward the request to the Express backend
    const response = await fetch(`${backendUrl}/api/stripe/pause-subscription`, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
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
    console.error('Error in pause-subscription proxy:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
