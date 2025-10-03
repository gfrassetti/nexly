/**
 * TypeScript interfaces for authentication-related data structures
 */

/**
 * JWT Payload interface
 * Represents the decoded JWT token structure
 */
export interface JwtPayload {
  id?: string;
  _id?: string;
  exp?: number;
  iat?: number;
  [key: string]: any; // Allow additional properties
}

/**
 * Authentication Error Response interface
 * Standardized error response for authentication failures
 */
export interface AuthErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * Authenticated Request interface
 * Extends Express Request to include user property with proper typing
 */
export interface AuthRequest extends Express.Request {
  user: JwtPayload;
}
