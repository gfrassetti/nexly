"use client";
import { useState } from "react";
import { sendWhatsAppMessage } from "@/lib/api";

export default function WhatsAppTester() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("¡Hola! Este es un mensaje de prueba desde Nexly 🚀");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (!phoneNumber || !message) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await sendWhatsAppMessage({
        to: phoneNumber,
        message: message
      });
      
      setResult({ success: true, data: response });
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-black">🧪 Probar WhatsApp</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Número de teléfono (con código de país)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+5491123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black placeholder-gray-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            Ejemplo: +5491123456789 (Argentina)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Mensaje
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black placeholder-gray-500"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !phoneNumber || !message}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Enviando..." : "📱 Enviar WhatsApp"}
        </button>

        {result && (
          <div className={`p-3 rounded-md ${
            result.success 
              ? "bg-green-100 border border-green-400 text-green-700" 
              : "bg-red-100 border border-red-400 text-red-700"
          }`}>
            <h4 className="font-medium mb-2">
              {result.success ? "✅ Mensaje enviado" : "❌ Error"}
            </h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
