import request from 'supertest';
import express from 'express';

// Mock del middleware de autenticación para testing
const mockAuthenticateToken = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
});

// Mock del logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock de la configuración
const mockConfig = {
  nexlyFacebookBusinessId: 'test-facebook-business-id',
  twilioAccountSid: 'test-twilio-account-sid'
};

// Mock de las dependencias
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: mockAuthenticateToken
}));

jest.mock('../../src/utils/logger', () => mockLogger);

jest.mock('../../src/config', () => ({
  config: mockConfig
}));

// Importar el router después de los mocks
import whatsappRouter from '../../src/routes/whatsapp';

describe('WhatsApp Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock del middleware de autenticación
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      (req as any).user = { id: 'test-user-id' };
      next();
    });
    
    app.use('/whatsapp', whatsappRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /whatsapp/create-signup-session', () => {
    it('should create signup session successfully', async () => {
      const requestBody = {
        returnUrl: 'https://example.com/success',
        failureUrl: 'https://example.com/failure'
      };

      const response = await request(app)
        .post('/whatsapp/create-signup-session')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.signupUrl).toContain('twilio.com/console/whatsapp/embedded-signup');
      expect(response.body.sessionId).toContain('signup_test-user-id');
    });

    it('should return 400 if returnUrl is missing', async () => {
      const requestBody = {
        failureUrl: 'https://example.com/failure'
      };

      const response = await request(app)
        .post('/whatsapp/create-signup-session')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('returnUrl y failureUrl son requeridos');
    });

    it('should return 400 if failureUrl is missing', async () => {
      const requestBody = {
        returnUrl: 'https://example.com/success'
      };

      const response = await request(app)
        .post('/whatsapp/create-signup-session')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('returnUrl y failureUrl son requeridos');
    });

    it('should return 401 if user is not authenticated', async () => {
      // Mock para simular usuario no autenticado
      mockAuthenticateToken.mockImplementation((req, res, next) => {
        (req as any).user = null;
        next();
      });

      const requestBody = {
        returnUrl: 'https://example.com/success',
        failureUrl: 'https://example.com/failure'
      };

      const response = await request(app)
        .post('/whatsapp/create-signup-session')
        .send(requestBody)
        .expect(401);

      expect(response.body.error).toBe('Usuario no autenticado');
    });
  });

  describe('GET /whatsapp/onboarding-callback', () => {
    it('should handle successful callback', async () => {
      const queryParams = {
        TwilioNumber: '+1234567890',
        WhatsAppBusinessAccountId: 'test-whatsapp-business-id',
        FacebookBusinessId: 'test-facebook-business-id',
        payload: JSON.stringify({ userId: 'test-user-id' })
      };

      const response = await request(app)
        .get('/whatsapp/onboarding-callback')
        .query(queryParams)
        .expect(302);

      expect(response.headers.location).toContain('/dashboard/integrations/connect/whatsapp/success');
      expect(response.headers.location).toContain('phone=+1234567890');
    });

    it('should redirect to error if payload is missing', async () => {
      const queryParams = {
        TwilioNumber: '+1234567890',
        WhatsAppBusinessAccountId: 'test-whatsapp-business-id'
      };

      const response = await request(app)
        .get('/whatsapp/onboarding-callback')
        .query(queryParams)
        .expect(302);

      expect(response.headers.location).toContain('/dashboard/integrations/connect/whatsapp/error');
    });
  });
});
