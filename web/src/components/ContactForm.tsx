"use client";
import { useState } from "react";
import emailjs from '@emailjs/browser';

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    // Validaciones básicas
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setToast({ type: 'error', message: 'Por favor completa todos los campos obligatorios.' });
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setToast({ type: 'error', message: 'Por favor ingresa un email válido.' });
      setLoading(false);
      return;
    }

    try {
      // Configuración de EmailJS (necesitarás crear una cuenta en emailjs.com)
      const serviceId = 'service_nexly'; // Cambiar por tu Service ID
      const templateId = 'template_contact'; // Cambiar por tu Template ID
      const publicKey = 'YOUR_PUBLIC_KEY'; // Cambiar por tu Public Key
      
      // Parámetros del email
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        company: formData.company || 'No especificado',
        message: formData.message,
        to_email: 'guidofrassetti@gmail.com'
      };

      // Enviar email usando EmailJS
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      
      setToast({ 
        type: 'success', 
        message: '¡Mensaje enviado correctamente! Te contactaremos pronto.' 
      });
      
      // Limpiar formulario
      setFormData({
        name: "",
        email: "",
        company: "",
        message: ""
      });

    } catch (error) {
      console.error('Error sending email:', error);
      setToast({ 
        type: 'error', 
        message: 'Error al enviar el mensaje. Intenta nuevamente más tarde.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Contáctanos</h2>
        <p className="text-neutral-300 text-lg">
          ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
          toast.type === 'success' 
            ? 'bg-green-900/50 border border-green-700 text-green-300' 
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {toast.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-current hover:opacity-70 transition-opacity duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-neutral-300 mb-2">
            Empresa
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent"
            placeholder="Nombre de tu empresa (opcional)"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-neutral-300 mb-2">
            Mensaje *
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent resize-none"
            placeholder="Cuéntanos cómo podemos ayudarte..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Enviar mensaje</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-neutral-400 text-sm">
          También puedes escribirnos a{" "}
          <a href="mailto:hola@nexly.com.ar" className="text-nexly-teal hover:text-nexly-green">
            hola@nexly.com.ar
          </a>
        </p>
      </div>
    </div>
  );
}
