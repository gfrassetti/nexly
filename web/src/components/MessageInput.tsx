"use client";
import { useState } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageInput({ 
  onSend, 
  placeholder = "Escribe un mensaje...",
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-neutral-700 bg-neutral-800">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Enviar
        </button>
      </div>
    </div>
  );
}

