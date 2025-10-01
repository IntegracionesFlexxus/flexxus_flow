/**
 * Analytics Routes - Sprint 13
 */

import { Router } from 'express';
import { container } from '@/container';
import { TYPES } from '@/container/types';
import { analyticsValidators } from '../validators/analytics.validators';

export function createAnalyticsRoutes(): Router {
  const router = Router();
  const controller = container.get(TYPES.AnalyticsController);

  // Conversation metrics
  router.get(
    '/metrics/conversations',
    analyticsValidators.getMetrics,
    controller.getConversationMetrics.bind(controller)
  );

  // Campaign metrics
  router.get(
    '/metrics/campaigns/:campaignId',
    analyticsValidators.getCampaignMetrics,
    controller.getCampaignMetrics.bind(controller)
  );

  // Customer metrics
  router.get(
    '/metrics/customers/:customerId',
    analyticsValidators.getCustomerMetrics,
    controller.getCustomerMetrics.bind(controller)
  );

  // Real-time metrics
  router.get(
    '/metrics/realtime',
    controller.getRealTimeMetrics.bind(controller)
  );

  // Channel comparison
  router.get(
    '/metrics/channels/comparison',
    controller.getChannelComparison.bind(controller)
  );

  return router;
}
