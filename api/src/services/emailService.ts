// api/src/services/emailService.ts
import twilio from 'twilio';

class EmailService {
  private client: twilio.Twilio | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.warn('⚠️ Twilio service not configured. Password recovery emails will not be sent.');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      console.log('✅ Twilio service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio service:', error);
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn('Twilio service not configured. Cannot send password reset email.');
      return false;
    }

    try {
      // Para desarrollo, mostrar enlace en consola
      console.log(`📧 Password reset email would be sent to ${email}:`);
      console.log(`📧 Reset URL: ${resetUrl}`);
      
      // En producción, aquí usarías Twilio SendGrid para enviar emails
      // Por ahora, solo loggeamos para desarrollo
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();