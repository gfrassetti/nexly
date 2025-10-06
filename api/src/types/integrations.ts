// Types for integrations functionality

export interface IntegrationLimits {
  canConnect: boolean;
  maxIntegrations: number;
  currentIntegrations: number;
  reason?: string;
  freeTrialInfo?: {
    used: boolean;
    canUse: boolean;
    isActive: boolean;
    timeRemaining: number;
    hoursRemaining: number;
  };
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: any;
  code?: string;
}

export interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface IntegrationConfig {
  metaAppId: string;
  metaAppSecret: string;
  apiUrl: string;
  frontendUrl: string;
}

export interface MetaApiTestResult {
  success: boolean;
  error: any;
  hasAccessToken: boolean;
  data?: any;
}

export interface SystemStatus {
  systemToken: {
    configured: boolean;
    wabaId: boolean;
    phoneNumberId: boolean;
  };
  systemApi: {
    connected: boolean;
    wabaInfo: any;
    phoneNumbers: any[];
    error: string | null;
  };
}

export interface VerificationResult {
  environment: {
    metaAppId: boolean;
    metaAppSecret: boolean;
    metaAccessToken: boolean;
    metaPhoneNumberId: boolean;
    metaWabaId: boolean;
    webhookVerifyToken: boolean;
    apiUrl: boolean;
  };
  webhook: {
    url: string;
    token: string;
  };
  metaApi: {
    connected: boolean;
    phoneNumber: string | null;
    verifiedName: string | null;
    error: string | null;
  };
}

export type IntegrationProvider = "whatsapp" | "instagram" | "messenger" | "telegram";
export type IntegrationStatus = "pending" | "linked" | "error";
