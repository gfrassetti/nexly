"use client";
import { useForm, ValidationError } from '@formspree/react';

export default function ContactForm() {
  const [state, handleSubmit] = useForm("movkqygz");

  // Si el formulario se envió exitosamente
  if (state.succeeded) {
    return (
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-nexly-green rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-accent-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-nexly-green">¡Mensaje enviado!</h2>
        <p className="text-neutral-300 text-base sm:text-lg mb-4 sm:mb-6">
          Gracias por contactarnos. Te responderemos pronto.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-nexly-teal hover:bg-nexly-green text-accent-cream font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-300 text-sm sm:text-base"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Contáctanos</h2>
        <p className="text-neutral-300 text-base sm:text-lg">
          ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent text-sm sm:text-base"
              placeholder="Tu nombre completo"
            />
            <ValidationError 
              prefix="Nombre" 
              field="name"
              errors={state.errors}
              className="text-red-400 text-sm mt-1"
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
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent text-sm sm:text-base"
              placeholder="tu@email.com"
            />
            <ValidationError 
              prefix="Email" 
              field="email"
              errors={state.errors}
              className="text-red-400 text-sm mt-1"
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
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent text-sm sm:text-base"
            placeholder="Nombre de tu empresa (opcional)"
          />
          <ValidationError 
            prefix="Empresa" 
            field="company"
            errors={state.errors}
            className="text-red-400 text-sm mt-1"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-neutral-300 mb-2">
            Mensaje *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-nexly-teal focus:border-transparent resize-none text-sm sm:text-base"
            placeholder="Cuéntanos cómo podemos ayudarte..."
          />
          <ValidationError 
            prefix="Mensaje" 
            field="message"
            errors={state.errors}
            className="text-red-400 text-sm mt-1"
          />
        </div>

        <button
          type="submit"
          disabled={state.submitting}
          className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-accent-cream font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          {state.submitting ? (
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

      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-neutral-400 text-xs sm:text-sm">
          También puedes escribirnos a{" "}
          <a href="mailto:hola@nexly.com.ar" className="text-nexly-teal hover:text-nexly-green">
            hola@nexly.com.ar
          </a>
        </p>
      </div>
    </div>
  );
}
