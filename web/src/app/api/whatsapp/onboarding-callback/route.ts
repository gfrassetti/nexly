import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Obtener los parámetros de la URL
    const { searchParams } = new URL(request.url);
    const TwilioNumber = searchParams.get('TwilioNumber');
    const WhatsAppBusinessAccountId = searchParams.get('WhatsAppBusinessAccountId');
    const FacebookBusinessId = searchParams.get('FacebookBusinessId');
    const payload = searchParams.get('payload');

    console.log('WhatsApp onboarding callback received:', {
      TwilioNumber,
      WhatsAppBusinessAccountId,
      FacebookBusinessId,
      payload
    });

    if (!payload) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos', request.url)
      );
    }

    const { userId } = JSON.parse(payload);

    if (TwilioNumber && WhatsAppBusinessAccountId && userId) {
      console.log('WhatsApp signup successful:', { 
        TwilioNumber, 
        WhatsAppBusinessAccountId,
        userId 
      });
      
      // TODO: Aquí podrías hacer una llamada al backend para actualizar la base de datos
      // await updateWhatsAppIntegration({ userId, phoneNumber: TwilioNumber, ... });
      
      // Redirigir a la página de éxito
      return NextResponse.redirect(
        new URL(`/dashboard/integrations/connect/whatsapp/success?phone=${TwilioNumber}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos', request.url)
    );

  } catch (error: any) {
    console.error('Error processing WhatsApp onboarding callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations/connect/whatsapp/error', request.url)
    );
  }
}
