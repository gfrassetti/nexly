import axios from 'axios';

interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

/**
 * Servicio para enviar mensajes a través de WhatsApp Cloud API
 */
export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.baseUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  }

  /**
   * Envía un mensaje de texto a WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          body: message
        }
      };

      console.log('Enviando mensaje WhatsApp:', {
        to: payload.to,
        message: payload.text.body,
        phoneNumberId: this.phoneNumberId
      });

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta WhatsApp:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('Error enviando mensaje WhatsApp:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`WhatsApp API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Formatea el número de teléfono para WhatsApp (debe incluir código de país)
   */
  private formatPhoneNumber(phone: string): string {
    // Remover espacios, guiones y paréntesis
    let formatted = phone.replace(/[\s\-\(\)]/g, '');
    
    // Si no tiene código de país, agregar +54 (Argentina)
    if (!formatted.startsWith('+') && !formatted.startsWith('54')) {
      formatted = '+54' + formatted;
    }
    
    // Si tiene +54 pero no tiene el +, agregarlo
    if (formatted.startsWith('54') && !formatted.startsWith('+54')) {
      formatted = '+' + formatted;
    }
    
    // Remover el + para la API de WhatsApp
    return formatted.replace('+', '');
  }

  /**
   * Verifica que la configuración de WhatsApp esté correcta
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      console.log('Verificación WhatsApp exitosa:', response.data);
      return true;
    } catch (error: any) {
      console.error('Error verificando WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * Función helper para crear instancia del servicio WhatsApp
 */
export function createWhatsAppService(accessToken: string, phoneNumberId: string): WhatsAppService {
  return new WhatsAppService(accessToken, phoneNumberId);
}
