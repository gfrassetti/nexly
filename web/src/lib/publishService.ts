interface Integration {
  id: string;
  provider: string;
  name: string;
  status: string;
  capabilities: {
    supportsVideo: boolean;
    supportsImage: boolean;
    maxVideoSize: string;
    maxImageSize?: string;
    maxDuration?: string;
    formats: string[];
  };
}

interface PublishRequest {
  media: File;
  caption: string;
  platforms: string[];
  scheduleTime?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

interface PublishResponse {
  success: boolean;
  message: string;
  results: PublishResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class PublishService {
  private baseUrl = '/api/publish';

  async getIntegrations(): Promise<Integration[]> {
    try {
      const response = await fetch(`${this.baseUrl}/integrations`);
      const data = await response.json();
      
      if (data.success) {
        return data.integrations;
      } else {
        throw new Error(data.error || 'Error obteniendo integraciones');
      }
    } catch (error) {
      console.error('Error obteniendo integraciones:', error);
      throw error;
    }
  }

  async publishContent(request: PublishRequest): Promise<PublishResponse> {
    try {
      const formData = new FormData();
      formData.append('media', request.media);
      formData.append('caption', request.caption);
      formData.append('platforms', JSON.stringify(request.platforms));
      
      if (request.scheduleTime) {
        formData.append('scheduleTime', request.scheduleTime);
      }

      const response = await fetch(`${this.baseUrl}/publish`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Error en publicación');
      }
    } catch (error) {
      console.error('Error publicando contenido:', error);
      throw error;
    }
  }

  async getPublishHistory(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/history`);
      const data = await response.json();
      
      if (data.success) {
        return data.publications;
      } else {
        throw new Error(data.error || 'Error obteniendo historial');
      }
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      throw error;
    }
  }

  // Utilidades para validación
  validateFile(file: File, platform: string): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'image/jpeg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo es demasiado grande (máximo 100MB)' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Formato de archivo no soportado' };
    }
    
    // Validaciones específicas por plataforma
    if (platform === 'tiktok') {
      if (!file.type.startsWith('video/')) {
        return { valid: false, error: 'TikTok solo soporta videos' };
      }
    }
    
    return { valid: true };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getPlatformIcon(provider: string): string {
    const icons = {
      instagram: '📷',
      tiktok: '🎵',
      facebook: '📘',
      twitter: '🐦'
    };
    
    return icons[provider as keyof typeof icons] || '📱';
  }

  getPlatformColor(provider: string): string {
    const colors = {
      instagram: 'from-purple-500 to-pink-500',
      tiktok: 'bg-black',
      facebook: 'bg-blue-600',
      twitter: 'bg-blue-400'
    };
    
    return colors[provider as keyof typeof colors] || 'bg-gray-500';
  }
}

export const publishService = new PublishService();
export type { Integration, PublishRequest, PublishResult, PublishResponse };
