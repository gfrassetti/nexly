// Interfaces para WhatsApp Cloud API webhook payloads

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: 'messages';
}

export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  sticker?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: {
    name: {
      formatted_name: string;
    };
    phones: Array<{
      phone: string;
      type: string;
    }>;
  }[];
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: 'CBP';
    category: 'user_initiated' | 'business_initiated';
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
        error_data?: {
      details: string;
    };
  }>;
}

export type WhatsAppMessageType = 
  | 'text'
  | 'image' 
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'system';

export interface ProcessedMessage {
  type: WhatsAppMessageType;
  content: string;
  metadata?: {
    imageId?: string;
    documentFilename?: string;
    audioId?: string;
    videoId?: string;
    stickerId?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
    };
    interactiveType?: string;
    interactiveTitle?: string;
  };
}

export interface MessageProcessingResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
