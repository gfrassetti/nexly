"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es';

type TextKeys = 
  | 'dashboard.title'
  | 'dashboard.welcome'
  | 'dashboard.stats'
  | 'dashboard.totalContacts'
  | 'dashboard.totalMessages'
  | 'dashboard.activeIntegrations'
  | 'dashboard.recentActivity'
  | 'dashboard.quickActions'
  | 'dashboard.viewContacts'
  | 'dashboard.sendMessage'
  | 'dashboard.connectWhatsApp'
  | 'dashboard.upgradePlan'
  | 'dashboard.plan'
  | 'dashboard.integrationsAvailable'
  | 'dashboard.allAvailable'
  | 'dashboard.upTo'
  | 'integrations.title'
  | 'integrations.connectWhatsApp'
  | 'integrations.whatsappBusiness'
  | 'integrations.instagram'
  | 'integrations.messenger'
  | 'integrations.completePayment'
  | 'integrations.upgradeToEnable'
  | 'integrations.connected'
  | 'integrations.disconnected'
  | 'integrations.pending'
  | 'whatsapp.demo.title'
  | 'whatsapp.demo.description'
  | 'whatsapp.demo.step1'
  | 'whatsapp.demo.step1.desc'
  | 'whatsapp.demo.step2'
  | 'whatsapp.demo.step2.desc'
  | 'whatsapp.demo.step3'
  | 'whatsapp.demo.step3.desc'
  | 'whatsapp.demo.step4'
  | 'whatsapp.demo.step4.desc'
  | 'whatsapp.demo.step5'
  | 'whatsapp.demo.step5.desc'
  | 'oauth.simulated'
  | 'oauth.description'
  | 'oauth.continue'
  | 'user.authenticated'
  | 'user.description'
  | 'user.status'
  | 'user.permissions'
  | 'user.plan'
  | 'user.connected'
  | 'user.whatsappBusiness'
  | 'message.interface'
  | 'message.description'
  | 'message.recipient'
  | 'message.content'
  | 'message.placeholder'
  | 'message.send'
  | 'sending.title'
  | 'sending.description'
  | 'sending.to'
  | 'sending.status'
  | 'sending.sending'
  | 'sending.sendApi'
  | 'sent.title'
  | 'sent.description'
  | 'sent.messageId'
  | 'sent.delivered'
  | 'sent.timestamp'
  | 'sent.verify'
  | 'verify.title'
  | 'verify.description'
  | 'verify.business'
  | 'verify.whatsappBusiness'
  | 'verify.complete'
  | 'verify.completeDesc'
  | 'verify.restart'
  | 'meta.title'
  | 'meta.note1'
  | 'meta.note2'
  | 'meta.note3'
  | 'meta.note4'
  | 'meta.note5'
  | 'subscription.required'
  | 'continue'
  | 'back'
  | 'next'
  | 'send'
  | 'cancel'
  | 'confirm'
  | 'loading'
  | 'success'
  | 'error';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TextKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Textos en inglés y español
const texts: Record<Language, Record<TextKeys, string>> = {
  en: {
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to Nexly',
    'dashboard.stats': 'Statistics',
    'dashboard.totalContacts': 'Total Contacts',
    'dashboard.totalMessages': 'Total Messages',
    'dashboard.activeIntegrations': 'Active Integrations',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.viewContacts': 'View Contacts',
    'dashboard.sendMessage': 'Send Message',
    'dashboard.connectWhatsApp': 'Connect WhatsApp',
    'dashboard.upgradePlan': 'Upgrade Plan',
    'dashboard.plan': 'Current Plan',
    'dashboard.integrationsAvailable': 'Available Integrations',
    'dashboard.allAvailable': 'All Available',
    'dashboard.upTo': 'Up to',
    
    // Integrations
    'integrations.title': 'Integrations',
    'integrations.connectWhatsApp': 'Connect WhatsApp',
    'integrations.whatsappBusiness': 'WhatsApp Business',
    'integrations.instagram': 'Instagram',
    'integrations.messenger': 'Messenger',
    'integrations.completePayment': 'Complete Payment',
    'integrations.upgradeToEnable': 'Upgrade to enable',
    'integrations.connected': 'Connected',
    'integrations.disconnected': 'Disconnected',
    'integrations.pending': 'Pending',
    
    // WhatsApp Demo
    'whatsapp.demo.title': 'Meta Review Demo - WhatsApp Business Integration',
    'whatsapp.demo.description': 'This demo shows the complete flow that will work once Meta approves our app. Currently in review mode - real API calls will be enabled after approval.',
    'whatsapp.demo.step1': 'Meta OAuth Authentication',
    'whatsapp.demo.step1.desc': 'Complete Meta login flow for WhatsApp Business access',
    'whatsapp.demo.step2': 'User Dashboard Access',
    'whatsapp.demo.step2.desc': 'User with proper permissions to send WhatsApp messages',
    'whatsapp.demo.step3': 'Message Composition',
    'whatsapp.demo.step3.desc': 'Interface for composing and sending WhatsApp messages',
    'whatsapp.demo.step4': 'Message Sending',
    'whatsapp.demo.step4.desc': 'Real-time message sending to WhatsApp Business API',
    'whatsapp.demo.step5': 'Delivery Confirmation',
    'whatsapp.demo.step5.desc': 'Confirmation that message was delivered to WhatsApp',
    
    // OAuth Flow
    'oauth.simulated': 'Meta OAuth Flow (Simulated)',
    'oauth.description': 'In the real app, this would redirect to Meta\'s OAuth page for WhatsApp Business permissions.',
    'oauth.continue': 'Continue to User Dashboard',
    
    // User Status
    'user.authenticated': 'User Authenticated',
    'user.description': 'User successfully logged in with Meta OAuth and has WhatsApp Business permissions.',
    'user.status': 'Status',
    'user.permissions': 'Permissions',
    'user.plan': 'Plan',
    'user.connected': 'Connected',
    'user.whatsappBusiness': 'WhatsApp Business',
    
    // Message Interface
    'message.interface': 'WhatsApp Message Interface',
    'message.description': 'User has access to the WhatsApp messaging interface with full permissions.',
    'message.recipient': 'Recipient WhatsApp Number',
    'message.content': 'Message Content',
    'message.placeholder': 'Type your WhatsApp message here...',
    'message.send': 'Send Message',
    
    // Message Sending
    'sending.title': 'Sending Message to WhatsApp',
    'sending.description': 'Message is being sent through WhatsApp Business Cloud API.',
    'sending.to': 'To',
    'sending.status': 'Status',
    'sending.sending': 'Sending...',
    'sending.sendApi': 'Send via WhatsApp API',
    
    // Message Sent
    'sent.title': 'Message Sent Successfully',
    'sent.description': 'Message has been delivered to WhatsApp Business Cloud API.',
    'sent.messageId': 'Message ID',
    'sent.delivered': 'Delivered',
    'sent.timestamp': 'Timestamp',
    'sent.verify': 'Verify in WhatsApp',
    
    // WhatsApp Verification
    'verify.title': 'Message Received in WhatsApp',
    'verify.description': 'The message appears in WhatsApp Web/Mobile, confirming successful delivery.',
    'verify.business': 'Nexly Business',
    'verify.whatsappBusiness': 'WhatsApp Business',
    'verify.complete': 'Demo Complete',
    'verify.completeDesc': 'This demonstrates the complete WhatsApp Business integration flow. Once Meta approves our app, all API calls will be real and functional.',
    'verify.restart': 'Restart Demo',
    
    // Meta Review Notes
    'meta.title': 'Meta Review Notes',
    'meta.note1': 'This demo shows the complete user experience',
    'meta.note2': 'Real API integration is implemented and ready',
    'meta.note3': 'Once approved, all calls will connect to WhatsApp Business API',
    'meta.note4': 'User authentication flow is fully implemented',
    'meta.note5': 'Message sending and delivery confirmation are ready',
    
    // Subscription
    'subscription.required': 'Demo requires active subscription. This simulates the real app behavior.',
    
    // Common
    'continue': 'Continue',
    'back': 'Back',
    'next': 'Next',
    'send': 'Send',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'loading': 'Loading...',
    'success': 'Success',
    'error': 'Error',
  },
  es: {
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Bienvenido a Nexly',
    'dashboard.stats': 'Estadísticas',
    'dashboard.totalContacts': 'Contactos Totales',
    'dashboard.totalMessages': 'Mensajes Totales',
    'dashboard.activeIntegrations': 'Integraciones Activas',
    'dashboard.recentActivity': 'Actividad Reciente',
    'dashboard.quickActions': 'Acciones Rápidas',
    'dashboard.viewContacts': 'Ver Contactos',
    'dashboard.sendMessage': 'Enviar Mensaje',
    'dashboard.connectWhatsApp': 'Conectar WhatsApp',
    'dashboard.upgradePlan': 'Actualizar Plan',
    'dashboard.plan': 'Plan Actual',
    'dashboard.integrationsAvailable': 'Integraciones Disponibles',
    'dashboard.allAvailable': 'Todas Disponibles',
    'dashboard.upTo': 'Hasta',
    
    // Integrations
    'integrations.title': 'Integraciones',
    'integrations.connectWhatsApp': 'Conectar WhatsApp',
    'integrations.whatsappBusiness': 'WhatsApp Business',
    'integrations.instagram': 'Instagram',
    'integrations.messenger': 'Messenger',
    'integrations.completePayment': 'Completar Pago',
    'integrations.upgradeToEnable': 'Actualizar para habilitar',
    'integrations.connected': 'Conectado',
    'integrations.disconnected': 'Desconectado',
    'integrations.pending': 'Pendiente',
    
    // WhatsApp Demo
    'whatsapp.demo.title': 'Demo para Revisión de Meta - Integración WhatsApp Business',
    'whatsapp.demo.description': 'Este demo muestra el flujo completo que funcionará una vez que Meta apruebe nuestra app. Actualmente en modo revisión - las llamadas API reales se habilitarán después de la aprobación.',
    'whatsapp.demo.step1': 'Autenticación OAuth de Meta',
    'whatsapp.demo.step1.desc': 'Flujo completo de login de Meta para acceso a WhatsApp Business',
    'whatsapp.demo.step2': 'Acceso al Dashboard del Usuario',
    'whatsapp.demo.step2.desc': 'Usuario con permisos apropiados para enviar mensajes de WhatsApp',
    'whatsapp.demo.step3': 'Composición de Mensajes',
    'whatsapp.demo.step3.desc': 'Interfaz para componer y enviar mensajes de WhatsApp',
    'whatsapp.demo.step4': 'Envío de Mensajes',
    'whatsapp.demo.step4.desc': 'Envío de mensajes en tiempo real a WhatsApp Business API',
    'whatsapp.demo.step5': 'Confirmación de Entrega',
    'whatsapp.demo.step5.desc': 'Confirmación de que el mensaje fue entregado a WhatsApp',
    
    // OAuth Flow
    'oauth.simulated': 'Flujo OAuth de Meta (Simulado)',
    'oauth.description': 'En la app real, esto redirigiría a la página OAuth de Meta para permisos de WhatsApp Business.',
    'oauth.continue': 'Continuar al Dashboard del Usuario',
    
    // User Status
    'user.authenticated': 'Usuario Autenticado',
    'user.description': 'Usuario logueado exitosamente con OAuth de Meta y tiene permisos de WhatsApp Business.',
    'user.status': 'Estado',
    'user.permissions': 'Permisos',
    'user.plan': 'Plan',
    'user.connected': 'Conectado',
    'user.whatsappBusiness': 'WhatsApp Business',
    
    // Message Interface
    'message.interface': 'Interfaz de Mensajes WhatsApp',
    'message.description': 'El usuario tiene acceso a la interfaz de mensajería de WhatsApp con permisos completos.',
    'message.recipient': 'Número de WhatsApp del Destinatario',
    'message.content': 'Contenido del Mensaje',
    'message.placeholder': 'Escribe tu mensaje de WhatsApp aquí...',
    'message.send': 'Enviar Mensaje',
    
    // Message Sending
    'sending.title': 'Enviando Mensaje a WhatsApp',
    'sending.description': 'El mensaje está siendo enviado a través de WhatsApp Business Cloud API.',
    'sending.to': 'Para',
    'sending.status': 'Estado',
    'sending.sending': 'Enviando...',
    'sending.sendApi': 'Enviar vía WhatsApp API',
    
    // Message Sent
    'sent.title': 'Mensaje Enviado Exitosamente',
    'sent.description': 'El mensaje ha sido entregado a WhatsApp Business Cloud API.',
    'sent.messageId': 'ID del Mensaje',
    'sent.delivered': 'Entregado',
    'sent.timestamp': 'Timestamp',
    'sent.verify': 'Verificar en WhatsApp',
    
    // WhatsApp Verification
    'verify.title': 'Mensaje Recibido en WhatsApp',
    'verify.description': 'El mensaje aparece en WhatsApp Web/Móvil, confirmando la entrega exitosa.',
    'verify.business': 'Nexly Business',
    'verify.whatsappBusiness': 'WhatsApp Business',
    'verify.complete': 'Demo Completo',
    'verify.completeDesc': 'Esto demuestra el flujo completo de integración de WhatsApp Business. Una vez que Meta apruebe nuestra app, todas las llamadas API serán reales y funcionales.',
    'verify.restart': 'Reiniciar Demo',
    
    // Meta Review Notes
    'meta.title': 'Notas para Revisión de Meta',
    'meta.note1': 'Este demo muestra la experiencia completa del usuario',
    'meta.note2': 'La integración API real está implementada y lista',
    'meta.note3': 'Una vez aprobado, todas las llamadas se conectarán a WhatsApp Business API',
    'meta.note4': 'El flujo de autenticación de usuario está completamente implementado',
    'meta.note5': 'El envío de mensajes y confirmación de entrega están listos',
    
    // Subscription
    'subscription.required': 'El demo requiere una suscripción activa. Esto simula el comportamiento real de la app.',
    
    // Common
    'continue': 'Continuar',
    'back': 'Atrás',
    'next': 'Siguiente',
    'send': 'Enviar',
    'cancel': 'Cancelar',
    'confirm': 'Confirmar',
    'loading': 'Cargando...',
    'success': 'Éxito',
    'error': 'Error',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: TextKeys): string => {
    return texts[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
