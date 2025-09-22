"use client";
import { useState, useRef, useEffect } from "react";
import AIAssistant from "./AIAssistant";

type ComposerProps = {
  threadId: string | null;
  token: string;
  onSend: (text: string) => Promise<void>;
  channel?: string;
  maxLength?: number;
  placeholder?: string;
  onTyping?: (isTyping: boolean) => void;
  onAttachmentClick?: () => void;
  disabled?: boolean;
};

export default function Composer({ 
  threadId, 
  token, 
  onSend, 
  channel = "whatsapp",
  maxLength = 4096,
  placeholder,
  onTyping,
  onAttachmentClick,
  disabled = false
}: ComposerProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  // Manejo de typing indicator
  useEffect(() => {
    if (onTyping && text.trim()) {
      setIsTyping(true);
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, onTyping]);

  // Limpiar typing al desmontar
  useEffect(() => {
    return () => {
      if (onTyping && isTyping) {
        onTyping(false);
      }
    };
  }, [onTyping, isTyping]);

  const handleSend = async () => {
    if (!text.trim() || isLoading || disabled) return;
    
    // Validaciones
    if (text.length > maxLength) {
      setError(`El mensaje es demasiado largo (máximo ${maxLength} caracteres)`);
      return;
    }

    if (!threadId) {
      setError("No hay conversación seleccionada");
      return;
    }

    if (!token) {
      setError("No estás autenticado");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onSend(text.trim());
      setText("");
      setError(null);
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      setError(error?.message || "Error al enviar el mensaje");
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    
    // Validar longitud máxima
    if (newText.length <= maxLength) {
      setText(newText);
      setError(null);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      
      if (newText.length <= maxLength) {
        setText(newText);
        // Restaurar cursor después del emoji
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
          textarea.focus();
        }, 0);
      }
    }
    setShowEmojiPicker(false);
  };

  // Funciones para IA
  const handleResponseGenerated = (response: string) => {
    setText(response);
    // Auto-enviar la respuesta generada por IA
    setTimeout(() => {
      handleSend();
    }, 500);
  };

  const handleAnalysisComplete = (analysis: any) => {
    console.log('Análisis de IA completado:', analysis);
    // Aquí podrías mostrar notificaciones o actualizar la UI
  };

  const getChannelInfo = () => {
    switch (channel.toLowerCase()) {
      case 'whatsapp':
        return { name: 'WhatsApp', color: 'text-green-400', icon: '📱' };
      case 'instagram':
        return { name: 'Instagram', color: 'text-pink-400', icon: '📸' };
      case 'messenger':
        return { name: 'Messenger', color: 'text-blue-400', icon: '💬' };
      default:
        return { name: channel, color: 'text-neutral-400', icon: '📞' };
    }
  };

  const channelInfo = getChannelInfo();

  if (!threadId) {
    return (
      <div className="border-t border-neutral-700 bg-neutral-800 p-4">
        <div className="flex items-center justify-center text-neutral-400">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Selecciona una conversación para enviar mensajes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-700 bg-neutral-800">
      {/* Error message */}
      {error && (
        <div className="px-4 pt-3">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-300 text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer area */}
      <div className="p-4">
        <div className="flex items-end gap-3">
          {/* Botón de adjuntar archivo */}
          <button
            type="button"
            onClick={onAttachmentClick}
            disabled={disabled || isLoading}
            className="flex-shrink-0 p-2 text-neutral-400 hover:text-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
            title="Adjuntar archivo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Botón de emojis */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled || isLoading}
            className="flex-shrink-0 p-2 text-neutral-400 hover:text-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
            title="Emojis"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Área de texto */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder || `Escribe un mensaje en ${channelInfo.name}...`}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              disabled={isLoading || disabled}
              maxLength={maxLength}
            />
            
            {/* Contador de caracteres */}
            {text.length > 0 && (
              <div className={`absolute bottom-1 right-3 text-xs ${
                text.length > maxLength * 0.9 ? 'text-yellow-400' : 
                text.length > maxLength * 0.95 ? 'text-red-400' : 'text-neutral-500'
              }`}>
                {text.length}/{maxLength}
              </div>
            )}
          </div>

          {/* AI Assistant */}
          <AIAssistant
            message={text}
            onResponseGenerated={handleResponseGenerated}
            onAnalysisComplete={handleAnalysisComplete}
            disabled={disabled}
          />

          {/* Botón de enviar */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading || disabled || text.length > maxLength}
            className={`flex-shrink-0 p-3 rounded-lg transition-colors ${
              text.trim() && !isLoading && !disabled && text.length <= maxLength
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
            }`}
            title={text.length > maxLength ? `Mensaje demasiado largo (${text.length}/${maxLength})` : "Enviar mensaje"}
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

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="mt-3 p-3 bg-neutral-700 rounded-lg border border-neutral-600">
            <div className="grid grid-cols-8 gap-2">
              {['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '👏', '😢', '😡', '🤷', '🙏', '💯', '✨'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:bg-neutral-600 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Indicadores de estado */}
        <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span>Enter para enviar</span>
            <span>Shift + Enter para nueva línea</span>
            {isTyping && (
              <span className="text-green-400 flex items-center gap-1">
                <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                Escribiendo...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={channelInfo.color}>{channelInfo.icon}</span>
            <span className={channelInfo.color}>{channelInfo.name}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Conectado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
