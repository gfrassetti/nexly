"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWhatsApp, connectWhatsAppCredentials } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function ConnectWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState({
    phoneNumberId: "",
    accessToken: "",
    phoneNumber: ""
  });
  const [instructions, setInstructions] = useState<any>(null);
  const { token } = useAuth();
  const router = useRouter();

  // Cargar instrucciones al montar el componente
  useEffect(() => {
    const loadInstructions = async () => {
      if (!token) return;
      
      try {
        console.log("Loading WhatsApp instructions...");
        const response = await connectWhatsApp(token);
        console.log("WhatsApp instructions response:", response);
        setInstructions(response);
      } catch (err: any) {
        console.error("Error loading instructions:", err);
        // Fallback instructions si falla la API
        setInstructions({
          message: "Para conectar WhatsApp Business, proporciona tu Phone Number ID y Access Token de Meta",
          instructions: {
            step1: "Ve a Meta for Developers (developers.facebook.com)",
            step2: "Crea una App de WhatsApp Business",
            step3: "En la sección WhatsApp, obtén tu Phone Number ID y Access Token",
            step4: "Pega esos valores en los campos de abajo y haz clic en 'Conectar'"
          }
        });
      }
    };

    loadInstructions();
  }, [token]);

  const handleConnect = async () => {
    if (!token) {
      setError("No hay token de autenticación. Por favor, inicia sesión nuevamente.");
      return;
    }

    if (!credentials.phoneNumberId || !credentials.accessToken) {
      setError("Por favor, completa todos los campos requeridos.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await connectWhatsAppCredentials(credentials, token);
      
      if (response.success) {
        // Redirigir al dashboard de integraciones con mensaje de éxito
        router.push("/dashboard/integrations?success=whatsapp_connected");
      }
    } catch (err: any) {
      console.error("Error connecting WhatsApp:", err);
      setError(err.message || "Error al conectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Conectar WhatsApp Business</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
            <span className="text-white text-xl font-bold">W</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">WhatsApp Business</h2>
            <p className="text-sm text-gray-600">Conecta tu cuenta usando credenciales de Meta</p>
          </div>
        </div>
        
        {instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Instrucciones:</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>1.</strong> {instructions.instructions?.step1}</p>
              <p><strong>2.</strong> {instructions.instructions?.step2}</p>
              <p><strong>3.</strong> {instructions.instructions?.step3}</p>
              <p><strong>4.</strong> {instructions.instructions?.step4}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number ID *
            </label>
            <input
              type="text"
              id="phoneNumberId"
              value={credentials.phoneNumberId}
              onChange={(e) => setCredentials(prev => ({ ...prev, phoneNumberId: e.target.value }))}
              placeholder="Ej: 123456789012345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
              Access Token *
            </label>
            <input
              type="password"
              id="accessToken"
              value={credentials.accessToken}
              onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
              placeholder="Tu access token de Meta"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Teléfono (opcional)
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={credentials.phoneNumber}
              onChange={(e) => setCredentials(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Ej: +1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          disabled={loading || !credentials.phoneNumberId || !credentials.accessToken}
          className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {loading ? "Conectando..." : "Conectar WhatsApp Business"}
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Tus credenciales se almacenan de forma segura y solo se usan para conectar con WhatsApp Business
        </p>
      </div>
    </div>
  );
}