// api/src/services/emailService.ts
import twilio from 'twilio';
import { config } from '../config';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

class EmailService {
  private client: twilio.Twilio | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Verificar si tenemos configuración de Twilio
    const twilioConfig = this.getTwilioConfig();
    
    if (!twilioConfig) {
      console.warn('⚠️ Twilio service not configured. Password recovery SMS will not be sent.');
      return;
    }

    try {
      this.client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
      this.isConfigured = true;
      console.log('✅ Twilio service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio service:', error);
    }
  }

  private getTwilioConfig(): TwilioConfig | null {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.log('⚠️ Twilio environment variables missing:');
      console.log('- TWILIO_ACCOUNT_SID:', !!accountSid);
      console.log('- TWILIO_AUTH_TOKEN:', !!authToken);
      console.log('- TWILIO_PHONE_NUMBER:', !!phoneNumber);
      return null;
    }

    return {
      accountSid,
      authToken,
      phoneNumber
    };
  }

  async sendPasswordResetSMS(phoneNumber: string, resetUrl: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn('Twilio service not configured. Cannot send password reset SMS.');
      return false;
    }

    try {
      const message = `🔐 Nexly - Recuperar contraseña\n\nHaz clic en este enlace para restablecer tu contraseña:\n${resetUrl}\n\nEste enlace expira en 1 hora.`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`✅ Password reset SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset SMS:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false;
    }

    try {
      const twilioConfig = this.getTwilioConfig();
      if (!twilioConfig) {
        throw new Error('Twilio config not available');
      }
      await this.client.api.accounts(twilioConfig.accountSid).fetch();
      console.log('✅ Twilio service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Twilio service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();