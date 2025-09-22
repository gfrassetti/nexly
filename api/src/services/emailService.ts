// api/src/services/emailService.ts
import sgMail from '@sendgrid/mail';

class EmailService {
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ SendGrid API key not configured. Password recovery emails will not be sent.');
      console.log('Required variable: SENDGRID_API_KEY');
      return;
    }

    try {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid service:', error);
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('SendGrid service not configured. Cannot send password reset email.');
      // Para desarrollo, mostrar enlace en consola
      console.log(`📧 [DEV] Reset URL for ${email}: ${resetUrl}`);
      return false;
    }

    try {
      const msg = {
        to: email,
        from: 'no-reply@nexly.com.ar', // Tu email verificado en SendGrid
        subject: '🔐 Recuperación de contraseña - Nexly',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🔐 Recuperar contraseña</h1>
              <p>Hola, has solicitado recuperar tu contraseña de Nexly</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Nexly.</p>
              
              <p>Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #14b8a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Restablecer contraseña</a>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este enlace expira en 1 hora</li>
                  <li>Si no solicitaste este cambio, ignora este email</li>
                </ul>
              </div>
              
              <p>Si el botón no funciona, copia este enlace:</p>
              <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px;">
              <p>Este email fue enviado por Nexly - Unifica tus mensajerías</p>
            </div>
          </div>
        `
      };

      await sgMail.send(msg);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      // Para desarrollo, mostrar enlace en consola si falla
      console.log(`📧 [DEV] Reset URL for ${email}: ${resetUrl}`);
      return false;
    }
  }
}

export const emailService = new EmailService();