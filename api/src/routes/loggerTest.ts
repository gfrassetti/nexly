import { Router, Request, Response } from 'express';
import logger, { 
  logIntegrationActivity, logIntegrationError, logIntegrationSuccess,
  logAuthActivity, logAuthError,
  logDatabase, logExternalService
} from '../utils/logger';

const router = Router();

/**
 * Endpoint para probar todos los niveles y funciones de logging
 */
router.get('/', (req: Request, res: Response) => {
  const testResults: { level: string; status: string; message?: string }[] = [];

  // 1. Probar logger básico
  logger.info('Test log info', { test: true });
  testResults.push({ level: 'info', status: 'logged' });
  
  logger.warning('Test log warning', { test: true });
  testResults.push({ level: 'warning', status: 'logged' });
  
  logger.error('Test log error', { test: true, error: 'Test error message' });
  testResults.push({ level: 'error', status: 'logged' });

  // 2. Probar logging de integrations
  const testUserId = 'test-user-123';
  logIntegrationActivity('test_activity', testUserId, { provider: 'instagram', action: 'connect_start' });
  testResults.push({ level: 'info', status: 'logged', message: 'Integration Activity' });
  
  logIntegrationSuccess('test_success', testUserId, { integrationId: 'test-integration-456', provider: 'whatsapp' });
  testResults.push({ level: 'info', status: 'logged', message: 'Integration Success' });
  
  logIntegrationError(new Error('Test integration error'), testUserId, 'test_error', {
    integrationId: 'test-integration-456',
    errorCode: 'OAUTH_FAILED'
  });
  testResults.push({ level: 'error', status: 'logged', message: 'Integration Error' });

  // 3. Probar diferentes niveles
  logger.debug('Debug message');
  testResults.push({ level: 'debug', status: 'logged' });
  
  logger.http('HTTP request message');
  testResults.push({ level: 'http', status: 'logged' });
  
  logger.info('Info message');
  testResults.push({ level: 'info', status: 'logged' });
  
  logger.warning('Warning message');
  testResults.push({ level: 'warning', status: 'logged' });
  
  logger.error('Error message');
  testResults.push({ level: 'error', status: 'logged' });
  
  logger.error('💀 FATAL: Error fatal', { 
    fatal: 'Error crítico del sistema',
    code: 'FATAL_001',
    critical: true,
    level: 'fatal'
  });
  testResults.push({ level: 'fatal', status: 'logged' });

  // 4. Probar funciones específicas de logging
  logAuthActivity('user_registered', 'user-abc', { plan: 'pro' });
  testResults.push({ level: 'info', status: 'logged', message: 'Auth Activity' });
  
  logAuthError(new Error('Invalid credentials'), 'login_failed', undefined, { identifier: 'test@example.com' });
  testResults.push({ level: 'error', status: 'logged', message: 'Auth Error' });
  
  logDatabase('find', 'users', { query: { email: 'test@example.com' } });
  testResults.push({ level: 'debug', status: 'logged', message: 'Database Operation' });
  
  logExternalService('stripe', 'create_checkout_session', { amount: 1000, currency: 'usd' });
  testResults.push({ level: 'info', status: 'logged', message: 'External Service' });

  res.json({
    message: 'Logging test executed. Check console and log files.',
    testResults,
    environment: process.env.NODE_ENV,
    loggerLevel: logger.level,
    totalTests: testResults.length
  });
});

/**
 * Endpoint para probar rendimiento del logging
 */
router.get('/performance', (req: Request, res: Response) => {
  const iterations = parseInt(req.query.iterations as string) || 1000;
  const startTime = process.hrtime.bigint();

  // Ejecutar múltiples logs para probar rendimiento
  for (let i = 0; i < iterations; i++) {
    logger.info(`Performance test log ${i}`, { 
      iteration: i, 
      timestamp: new Date().toISOString(),
      testData: { id: i, random: Math.random() }
    });
  }

  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1_000_000;

  res.json({
    message: `Performance test completed for ${iterations} iterations.`,
    durationMs: `${durationMs.toFixed(2)}ms`,
    logsPerSecond: `${(iterations / (durationMs / 1000)).toFixed(2)} logs/s`,
    averageTimePerLog: `${(durationMs / iterations).toFixed(4)}ms`,
    environment: process.env.NODE_ENV,
    loggerLevel: logger.level
  });
});

/**
 * Endpoint para probar logging con datos complejos
 */
router.get('/complex', (req: Request, res: Response) => {
  const complexData = {
    user: { 
      id: 'user-123', 
      email: 'test@example.com', 
      subscription: 'pro',
      settings: { theme: 'dark', notifications: true }
    },
    integration: { 
      provider: 'instagram', 
      status: 'connected', 
      lastSync: new Date(),
      metadata: { 
        pageId: '123456789', 
        pageName: 'Test Business Page',
        permissions: ['pages_read_engagement', 'pages_manage_posts']
      }
    },
    request: { 
      method: 'POST', 
      endpoint: '/integrations/oauth/instagram/callback', 
      userAgent: 'Mozilla/5.0 (Test Browser)', 
      ip: '127.0.0.1',
      headers: { 'content-type': 'application/json' }
    }
  };

  logger.info('Complex integration log', complexData);
  logIntegrationActivity('complex_test', 'user-123', complexData);

  res.json({
    message: 'Complex logging test executed.',
    dataLogged: complexData,
    environment: process.env.NODE_ENV
  });
});

export default router;
