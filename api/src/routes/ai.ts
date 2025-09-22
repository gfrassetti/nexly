import { Router } from 'express';
import { aiService } from '../services/aiService';
import authenticateToken from '../middleware/auth';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

/**
 * Analizar mensaje entrante
 */
router.post('/analyze', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje es requerido' });
  }

  try {
    const analysis = await aiService.analyzeMessage(message, context);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('Error analizando mensaje:', error);
    res.status(500).json({ 
      error: 'Error analizando mensaje',
      details: error.message 
    });
  }
}));

/**
 * Generar respuesta automática
 */
router.post('/generate-response', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const { message, businessContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje es requerido' });
  }

  try {
    const response = await aiService.generateResponse(message, businessContext);
    
    res.json({
      success: true,
      response
    });
  } catch (error: any) {
    console.error('Error generando respuesta:', error);
    res.status(500).json({ 
      error: 'Error generando respuesta',
      details: error.message 
    });
  }
}));

/**
 * Clasificar urgencia del mensaje
 */
router.post('/classify-urgency', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje es requerido' });
  }

  try {
    const urgency = await aiService.classifyUrgency(message);
    
    res.json({
      success: true,
      urgency
    });
  } catch (error: any) {
    console.error('Error clasificando urgencia:', error);
    res.status(500).json({ 
      error: 'Error clasificando urgencia',
      details: error.message 
    });
  }
}));

export default router;
