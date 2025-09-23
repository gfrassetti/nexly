"use client";
import { useState } from "react";
import { analyzeMessage, generateResponse, classifyUrgency } from "@/lib/api";

interface AIAssistantProps {
  message: string;
  onResponseGenerated: (response: string) => void;
  onAnalysisComplete: (analysis: any) => void;
  disabled?: boolean;
}

export default function AIAssistant({ 
  message, 
  onResponseGenerated, 
  onAnalysisComplete,
  disabled = false 
}: AIAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!message.trim() || disabled) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeMessage(message.trim());
      
      if (response.success) {
        setAnalysis(response.analysis);
        onAnalysisComplete(response.analysis);
        setShowPanel(true);
      } else {
        throw new Error('Error en el análisis');
      }
    } catch (err: any) {
      console.error('Error analizando mensaje:', err);
      setError(err.message || 'Error al analizar el mensaje');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateResponse = async () => {
    if (!message.trim() || disabled) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateResponse(message.trim());
      
      if (response.success) {
        onResponseGenerated(response.response);
        setShowPanel(false);
      } else {
        throw new Error('Error generando respuesta');
      }
    } catch (err: any) {
      console.error('Error generando respuesta:', err);
      setError(err.message || 'Error al generar respuesta');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return '💰';
      case 'support': return '💬';
      case 'complaint': return '⚠️';
      default: return '💬';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="relative">
      {/* Botón principal de IA */}
      <button
        onClick={handleAnalyze}
        disabled={!message.trim() || disabled || isAnalyzing}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${!message.trim() || disabled 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
          }
        `}
      >
        {isAnalyzing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>IA</span>
          </>
        )}
      </button>

      {/* Panel de análisis */}
      {showPanel && analysis && (
        <div className="absolute bottom-full mb-2 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Análisis de IA</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Análisis */}
            <div className="space-y-3">
              {/* Sentimiento */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Sentimiento:</span>
                <span className={`text-sm font-medium ${getSentimentColor(analysis.sentiment)}`}>
                  {getSentimentIcon(analysis.sentiment)} {analysis.sentiment}
                </span>
              </div>

              {/* Categoría */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Categoría:</span>
                <span className="text-sm font-medium text-white">
                  {getCategoryIcon(analysis.category)} {analysis.category}
                </span>
              </div>

              {/* Confianza */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Confianza:</span>
                <span className="text-sm font-medium text-white">{analysis.confidence}%</span>
              </div>

              {/* Respuesta sugerida */}
              {analysis.suggestedResponse && (
                <div>
                  <span className="text-sm text-gray-300 block mb-1">Respuesta sugerida:</span>
                  <div className="bg-gray-700 p-2 rounded text-sm text-gray-200">
                    {analysis.suggestedResponse}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleGenerateResponse}
                disabled={isGenerating}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                {isGenerating ? 'Generando...' : 'Usar IA'}
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-full mb-2 right-0 w-80 bg-red-800 border border-red-600 rounded-lg shadow-xl z-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-200">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
