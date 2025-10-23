'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Instagram, Music, Calendar, Hash } from 'lucide-react';
import { publishService, type Integration, type PublishResult } from '@/lib/publishService';


export default function PublishModule() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar integraciones disponibles
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const integrations = await publishService.getIntegrations();
      setIntegrations(integrations);
    } catch (error) {
      console.error('Error cargando integraciones:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (!mediaFile || selectedPlatforms.length === 0 || !caption.trim()) {
      return;
    }

    setIsPublishing(true);
    setPublishResults([]);

    try {
      const fullCaption = caption + (hashtags ? ' ' + hashtags : '');
      
      const result = await publishService.publishContent({
        media: mediaFile,
        caption: fullCaption,
        platforms: selectedPlatforms,
        scheduleTime: scheduleTime || undefined
      });
      
      setPublishResults(result.results);
      
      // Limpiar formulario después de publicación exitosa
      if (result.summary.successful > 0) {
        setCaption('');
        setHashtags('');
        setMediaFile(null);
        setMediaPreview(null);
        setSelectedPlatforms([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error publicando:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const getPlatformIcon = (provider: string) => {
    switch (provider) {
      case 'instagram':
        return <Instagram className="w-5 h-5" />;
      case 'tiktok':
        return <Music className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (provider: string) => {
    switch (provider) {
      case 'instagram':
        return 'from-purple-500 to-pink-500';
      case 'tiktok':
        return 'bg-black';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Publicación Unificada
        </h1>
        <p className="text-gray-600">
          Publica tu contenido en TikTok e Instagram desde un solo lugar
        </p>
      </div>

      {/* Selección de plataformas */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona las plataformas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedPlatforms.includes(integration.provider)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePlatformToggle(integration.provider)}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  integration.provider === 'instagram' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'bg-black'
                }`}>
                  {getPlatformIcon(integration.provider)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-600">
                    {integration.capabilities.supportsVideo && integration.capabilities.supportsImage
                      ? 'Video e Imagen'
                      : integration.capabilities.supportsVideo
                      ? 'Solo Video'
                      : 'Solo Imagen'
                    }
                  </p>
                </div>
                {selectedPlatforms.includes(integration.provider) && (
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload de archivo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenido multimedia</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {mediaPreview ? (
            <div className="space-y-4">
              {mediaFile?.type.startsWith('video/') ? (
                <video 
                  src={mediaPreview} 
                  controls 
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                />
              ) : (
                <img 
                  src={mediaPreview} 
                  alt="Preview" 
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                />
              )}
              <div className="flex items-center justify-center space-x-2">
                <span className="text-sm text-gray-600">{mediaFile?.name}</span>
                <button
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Arrastra tu archivo aquí o haz clic para seleccionar</p>
              <p className="text-sm text-gray-500">
                Formatos soportados: MP4, MOV, AVI, JPG, PNG, GIF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Seleccionar archivo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h3>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escribe la descripción de tu publicación..."
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Hashtags */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h3>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#hashtag1 #hashtag2 #hashtag3"
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Programación (opcional) */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Programar publicación (opcional)</h3>
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botón de publicación */}
      <div className="mb-6">
        <button
          onClick={handlePublish}
          disabled={!mediaFile || selectedPlatforms.length === 0 || !caption.trim() || isPublishing}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
            !mediaFile || selectedPlatforms.length === 0 || !caption.trim() || isPublishing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {isPublishing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Publicando...</span>
            </div>
          ) : (
            `Publicar en ${selectedPlatforms.length} plataforma${selectedPlatforms.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>

      {/* Resultados de publicación */}
      {publishResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>
          <div className="space-y-3">
            {publishResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg flex items-center space-x-3 ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getPlatformIcon(result.platform)}
                    <span className="font-semibold capitalize">{result.platform}</span>
                  </div>
                  {result.success ? (
                    <p className="text-sm text-green-600">Publicado exitosamente</p>
                  ) : (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
