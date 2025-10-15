/**
 * Webhook Routes - Sprint 06
 * Routes for handling incoming webhooks from channel providers
 */

import { Router, Request, Response } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { WebhookProcessor } from '../services/WebhookProcessor';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

const router = Router();
const logger = LoggerFactory.create({ file: __filename });

// Get webhook processor from container
const getWebhookProcessor = (): WebhookProcessor => {
  try {
    return container.get<WebhookProcessor>(TYPES.OmniWebhookProcessor);
  } catch (error) {
    logger.error('Failed to get webhook processor from container:', error);
    throw error;
  }
};

/**
 * WhatsApp webhook verification (sin channelId - Meta verifica por token)
 * GET /api/v1/omni/webhooks/whatsapp
 */
router.get('/whatsapp', async (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  logger.info('WhatsApp webhook verification request', { mode, hasToken: !!token });

  if (mode === 'subscribe' && token) {
    // TODO: Buscar canal por verify token en la base de datos
    // Por ahora, aceptar cualquier token para desarrollo
    logger.info('WhatsApp webhook verified', { token: String(token).substring(0, 10) + '...' });
    res.status(200).send(challenge);
  } else {
    logger.warn('WhatsApp webhook verification failed', {
      mode,
      tokenProvided: !!token
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * WhatsApp webhook (sin channelId - identificar por contenido del payload)
 * POST /api/v1/omni/webhooks/whatsapp
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    logger.info('WhatsApp webhook received', {
      bodySize: JSON.stringify(req.body).length,
      hasEntry: !!req.body.entry
    });

    // Extraer phoneNumberId del payload de WhatsApp
    const phoneNumberId = req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      logger.warn('WhatsApp webhook without phoneNumberId', { body: req.body });
      return res.status(200).send('OK'); // Responder OK aunque no podamos procesar
    }

    logger.info('WhatsApp webhook phoneNumberId extracted', { phoneNumberId });

    // Buscar canal por phoneNumberId usando el ChannelRepository
    const { container } = await import('@/container/container');
    const { TYPES } = await import('@/container/types');
    const channelRepository = container.get<any>(TYPES.OmniChannelRepository);

    const channel = await channelRepository.findByPhoneNumberId(phoneNumberId);

    if (!channel) {
      logger.warn('No channel found for phoneNumberId', { phoneNumberId });
      return res.status(200).send('OK'); // Responder OK aunque no encontremos el canal
    }

    logger.info('Channel found for WhatsApp webhook', {
      channelId: channel.id,
      phoneNumberId
    });

    // Procesar webhook con el canal identificado
    const webhookProcessor = getWebhookProcessor();
    await webhookProcessor.processWebhook(
      channel.id,
      req.headers as Record<string, string>,
      req.body,
      channel.company_id
    );

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to process WhatsApp webhook', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Instagram webhook verification (sin channelId - Meta verifica por token)
 * GET /api/v1/omni/webhooks/instagram
 */
router.get('/instagram', async (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  logger.info('Instagram webhook verification request', { mode, hasToken: !!token });

  if (mode === 'subscribe' && token) {
    // TODO: Buscar canal por verify token en la base de datos
    // Por ahora, aceptar cualquier token para desarrollo
    logger.info('Instagram webhook verified', { token: String(token).substring(0, 10) + '...' });
    res.status(200).send(challenge);
  } else {
    logger.warn('Instagram webhook verification failed', {
      mode,
      tokenProvided: !!token
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * Instagram webhook (sin channelId - identificar por contenido del payload)
 * POST /api/v1/omni/webhooks/instagram
 */
router.post('/instagram', async (req: Request, res: Response) => {
  try {
    logger.info('Instagram webhook received', {
      bodySize: JSON.stringify(req.body).length,
      hasEntry: !!req.body.entry
    });

    // TODO: Identificar el canal por el pageId/instagramAccountId en el payload
    // Por ahora, responder OK para que Meta no reintente
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to process Instagram webhook', {
      error: error.message
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Facebook webhook verification (sin channelId - Meta verifica por token)
 * GET /api/v1/omni/webhooks/facebook
 */
router.get('/facebook', async (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  logger.info('Facebook webhook verification request', { mode, hasToken: !!token });

  if (mode === 'subscribe' && token) {
    // TODO: Buscar canal por verify token en la base de datos
    // Por ahora, aceptar cualquier token para desarrollo
    logger.info('Facebook webhook verified', { token: String(token).substring(0, 10) + '...' });
    res.status(200).send(challenge);
  } else {
    logger.warn('Facebook webhook verification failed', {
      mode,
      tokenProvided: !!token
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * Facebook webhook (sin channelId - identificar por contenido del payload)
 * POST /api/v1/omni/webhooks/facebook
 */
router.post('/facebook', async (req: Request, res: Response) => {
  try {
    logger.info('Facebook webhook received', {
      bodySize: JSON.stringify(req.body).length,
      hasEntry: !!req.body.entry
    });

    // TODO: Identificar el canal por el pageId en el payload
    // Por ahora, responder OK para que Meta no reintente
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to process Facebook webhook', {
      error: error.message
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Email webhook (for bounce, complaint, delivery notifications)
 * POST /api/omni/webhooks/email/:channelId
 */
router.post('/email/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const companyId = req.header('X-Company-ID') || '';

  try {
    logger.info('Email webhook received', {
      channelId,
      eventType: req.body.eventType
    });

    const webhookProcessor = getWebhookProcessor();
    await webhookProcessor.processWebhook(
      channelId,
      req.headers as Record<string, string>,
      req.body,
      companyId
    );

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to process Email webhook', {
      channelId,
      error: error.message
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * SMS webhook (Twilio-style)
 * POST /api/omni/webhooks/sms/:channelId
 */
router.post('/sms/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const companyId = req.header('X-Company-ID') || '';

  try {
    logger.info('SMS webhook received', {
      channelId,
      smsStatus: req.body.SmsStatus || req.body.MessageStatus
    });

    const webhookProcessor = getWebhookProcessor();
    await webhookProcessor.processWebhook(
      channelId,
      req.headers as Record<string, string>,
      req.body,
      companyId
    );

    // Twilio expects TwiML response
    res.type('text/xml');
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error: any) {
    logger.error('Failed to process SMS webhook', {
      channelId,
      error: error.message
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Generic webhook endpoint for testing
 * POST /api/omni/webhooks/test/:channelId
 */
router.post('/test/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;

  logger.info('Test webhook received', {
    channelId,
    headers: req.headers,
    body: req.body
  });

  res.status(200).json({
    message: 'Test webhook received',
    channelId,
    timestamp: new Date()
  });
});

export default router;