import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface AIAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  category: 'sales' | 'support' | 'complaint' | 'general';
  suggestedResponse?: string;
  confidence: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.googleAIApiKey) {
      throw new Error('GOOGLE_AI_API_KEY no configurado');
    }
    
    this.genAI = new GoogleGenerativeAI(config.googleAIApiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Analiza un mensaje entrante y proporciona insights
   */
  async analyzeMessage(message: string, context?: string): Promise<AIAnalysis> {
    try {
      const prompt = `
Analiza el siguiente mensaje de un cliente y proporciona:

1. Sentimiento: positive, negative, o neutral
2. Categoría: sales (ventas), support (soporte), complaint (queja), o general
3. Sugerencia de respuesta (opcional)
4. Confianza (0-100)

Mensaje: "${message}"
Contexto: ${context || 'Sin contexto adicional'}

Responde en formato JSON:
{
  "sentiment": "positive|negative|neutral",
  "category": "sales|support|complaint|general", 
  "suggestedResponse": "Respuesta sugerida...",
  "confidence": 85
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response.text();
      
      // Parsear la respuesta JSON
      const analysis = JSON.parse(response);
      
      return {
        sentiment: analysis.sentiment,
        category: analysis.category,
        suggestedResponse: analysis.suggestedResponse,
        confidence: analysis.confidence
      };

    } catch (error) {
      console.error('Error analizando mensaje con IA:', error);
      
      // Fallback en caso de error
      return {
        sentiment: 'neutral',
        category: 'general',
        confidence: 0
      };
    }
  }

  /**
   * Genera una respuesta automática basada en el contexto
   */
  async generateResponse(message: string, businessContext?: string): Promise<string> {
    try {
      const prompt = `
Eres un asistente de atención al cliente para una empresa de mensajería unificada (WhatsApp, Instagram, Messenger).

Genera una respuesta profesional, amigable y útil para este mensaje:

Mensaje del cliente: "${message}"
Contexto del negocio: ${businessContext || 'Empresa de mensajería unificada'}

La respuesta debe ser:
- Profesional pero amigable
- Útil y específica
- En español
- Máximo 150 caracteres
- Incluir emoji apropiado si es necesario

Respuesta:
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response.text();
      
      return response.trim();

    } catch (error) {
      console.error('Error generando respuesta con IA:', error);
      
      // Fallback
      return "Gracias por contactarnos. Un agente te responderá pronto. 😊";
    }
  }

  /**
   * Clasifica la urgencia de un mensaje
   */
  async classifyUrgency(message: string): Promise<'low' | 'medium' | 'high'> {
    try {
      const prompt = `
Clasifica la urgencia de este mensaje de cliente:

Mensaje: "${message}"

Responde solo con: low, medium, o high

Urgencia:
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response.text().trim().toLowerCase();
      
      if (response.includes('high')) return 'high';
      if (response.includes('medium')) return 'medium';
      return 'low';

    } catch (error) {
      console.error('Error clasificando urgencia:', error);
      return 'medium';
    }
  }
}

// Instancia singleton
export const aiService = new AIService();
