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
 * WhatsApp webhook verification
 * GET /api/omni/webhooks/whatsapp/:channelId
 */
router.get('/whatsapp/:channelId', (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified', { channelId: req.params.channelId });
    res.status(200).send(challenge);
  } else {
    logger.warn('WhatsApp webhook verification failed', {
      channelId: req.params.channelId,
      mode,
      tokenProvided: !!token
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * WhatsApp webhook
 * POST /api/omni/webhooks/whatsapp/:channelId
 */
router.post('/whatsapp/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const companyId = req.header('X-Company-ID') || '';

  try {
    logger.info('WhatsApp webhook received', {
      channelId,
      bodySize: JSON.stringify(req.body).length
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
    logger.error('Failed to process WhatsApp webhook', {
      channelId,
      error: error.message
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Instagram webhook verification
 * GET /api/omni/webhooks/instagram/:channelId
 */
router.get('/instagram/:channelId', (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    logger.info('Instagram webhook verified', { channelId: req.params.channelId });
    res.status(200).send(challenge);
  } else {
    logger.warn('Instagram webhook verification failed', {
      channelId: req.params.channelId,
      mode,
      tokenProvided: !!token
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * Instagram webhook
 * POST /api/omni/webhooks/instagram/:channelId
 */
router.post('/instagram/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const companyId = req.header('X-Company-ID') || '';

  try {
    logger.info('Instagram webhook received', {
      channelId,
      bodySize: JSON.stringify(req.body).length
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
    logger.error('Failed to process Instagram webhook', {
      channelId,
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