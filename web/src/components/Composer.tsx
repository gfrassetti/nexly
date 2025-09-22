"use client";
import { useState, useRef, useEffect } from "react";

type ComposerProps = {
  threadId: string | null;
  token: string;
  onSend: (text: string) => Promise<void>;
};

export default function Composer({ threadId, token, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      await onSend(text.trim());
      setText("");
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!threadId) {
    return (
      <div className="border-t border-neutral-700 bg-neutral-800 p-4">
        <div className="flex items-center justify-center text-neutral-400">
          <p className="text-sm">Selecciona una conversación para enviar mensajes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-700 bg-neutral-800 p-4">
      <div className="flex items-end gap-3">
        {/* Botón de adjuntar archivo */}
        <button
          type="button"
          className="flex-shrink-0 p-2 text-neutral-400 hover:text-neutral-300 transition-colors"
          title="Adjuntar archivo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Área de texto */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-h-32"
            rows={1}
            disabled={isLoading}
          />
          
          {/* Contador de caracteres */}
          {text.length > 0 && (
            <div className="absolute bottom-1 right-3 text-xs text-neutral-500">
              {text.length}
            </div>
          )}
        </div>

        {/* Botón de enviar */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className={`flex-shrink-0 p-3 rounded-lg transition-colors ${
            text.trim() && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Indicadores de estado */}
      <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
        <div className="flex items-center gap-4">
          <span>Presiona Enter para enviar</span>
          <span>Shift + Enter para nueva línea</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Conectado</span>
        </div>
      </div>
    </div>
  );
}
