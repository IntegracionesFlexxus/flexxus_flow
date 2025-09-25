/**
 * Debug version of OpportunityController
 * Adds extensive logging to debug the pipeline endpoint
 */

import { Request, Response, NextFunction } from 'express';

export async function debugGetPipelineMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  console.log('============================================');
  console.log('🎯 [DEBUG] getPipelineMetrics endpoint called');
  console.log('============================================');

  console.log('📦 [DEBUG] Request details:', {
    method: req.method,
    path: req.path,
    url: req.url,
    query: req.query,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'None',
      'content-type': req.headers['content-type']
    }
  });

  try {
    // Check user authentication
    const user = (req as any).user;
    console.log('👤 [DEBUG] User info:', {
      id: user?.id,
      companyId: user?.companyId,
      email: user?.email,
      hasUser: !!user
    });

    if (!user) {
      console.error('❌ [DEBUG] No user in request!');
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const companyId = user.companyId;
    const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;

    console.log('🏢 [DEBUG] Company ID:', companyId);
    console.log('👤 [DEBUG] Owner ID:', ownerId);

    // Check if service is available
    const opportunityService = (this as any).opportunityService;
    console.log('🔧 [DEBUG] OpportunityService available:', !!opportunityService);

    if (!opportunityService) {
      console.error('❌ [DEBUG] OpportunityService not injected!');
      return res.status(500).json({
        success: false,
        message: 'Service not available'
      });
    }

    console.log('📡 [DEBUG] Calling opportunityService.getPipelineMetrics...');
    const startTime = Date.now();

    try {
      const metrics = await opportunityService.getPipelineMetrics(companyId, ownerId);

      const endTime = Date.now();
      console.log(`⏱️ [DEBUG] Service call took ${endTime - startTime}ms`);

      console.log('✅ [DEBUG] Metrics received from service');
      console.log('📊 [DEBUG] Metrics structure:', {
        isNull: metrics === null,
        isUndefined: metrics === undefined,
        type: typeof metrics,
        hasStages: !!metrics?.stages,
        stagesCount: metrics?.stages?.length || 0,
        stagesData: metrics?.stages?.slice(0, 2), // First 2 stages for debugging
        totalOpportunities: metrics?.total_opportunities,
        totalValue: metrics?.total_value,
        averageDealSize: metrics?.average_deal_size,
        conversionRate: metrics?.conversion_rate
      });

      // Check if we have the expected structure
      if (!metrics || typeof metrics !== 'object') {
        console.error('❌ [DEBUG] Invalid metrics structure received!');
        console.error('❌ [DEBUG] Metrics value:', metrics);
      }

      const response = {
        success: true,
        data: metrics || {}
      };

      console.log('📤 [DEBUG] Preparing response...');
      console.log('📤 [DEBUG] Response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: Object.keys(response.data || {})
      });

      res.json(response);
      console.log('✅ [DEBUG] Response sent successfully');

    } catch (serviceError) {
      console.error('❌ [DEBUG] Service call failed:', serviceError);
      console.error('❌ [DEBUG] Service error details:', {
        message: serviceError.message,
        stack: serviceError.stack,
        name: serviceError.name
      });
      throw serviceError;
    }

  } catch (error) {
    console.error('============================================');
    console.error('🔥 [DEBUG] FATAL ERROR in getPipelineMetrics');
    console.error('============================================');
    console.error('❌ [DEBUG] Error object:', error);
    console.error('❌ [DEBUG] Error message:', error.message);
    console.error('❌ [DEBUG] Error stack:', error.stack);

    // Send error response
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      debug: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    });
  }
}