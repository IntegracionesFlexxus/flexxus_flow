/**
 * Debug version of OpportunityRepository getPipelineMetrics
 * Adds extensive logging to identify the database query issue
 */

export async function debugGetPipelineMetrics(companyId: number, ownerId?: number): Promise<any> {
  console.log('============================================');
  console.log('🗄️ [Repository] getPipelineMetrics called');
  console.log('============================================');
  console.log('📊 Parameters:', { companyId, ownerId });

  const db = (this as any).db;
  if (!db) {
    console.error('❌ [Repository] Database connection not available!');
    throw new Error('Database connection not available');
  }

  let baseCondition = `o.company_id = $1 AND o.status = 'open'`;
  const params: any[] = [companyId];

  if (ownerId) {
    baseCondition += ` AND o.owner_id = $2`;
    params.push(ownerId);
  }

  console.log('🔍 [Repository] Base condition:', baseCondition);
  console.log('📦 [Repository] Parameters:', params);

  // Query for pipeline stages
  const pipelineQuery = `
    SELECT
      s.id as stage_id,
      s.name as stage_name,
      s.order_position,
      s.probability,
      COUNT(o.id) as opportunity_count,
      COALESCE(SUM(o.amount), 0) as total_amount,
      COALESCE(SUM(o.amount * s.probability / 100), 0) as weighted_amount
    FROM public.sales_stages s
    LEFT JOIN public.opportunities o ON s.id = o.stage_id AND ${baseCondition}
    WHERE s.company_id = $1
    GROUP BY s.id, s.name, s.order_position, s.probability
    ORDER BY s.order_position
  `;

  // Query for overall metrics
  const metricsQuery = `
    SELECT
      COUNT(*) as total_opportunities,
      COALESCE(SUM(amount), 0) as total_value,
      COALESCE(SUM(amount * probability / 100), 0) as weighted_value,
      COALESCE(AVG(amount), 0) as average_deal_size,
      COUNT(CASE WHEN status = 'won' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END), 0) as conversion_rate,
      COALESCE(AVG(
        CASE WHEN status = 'won' THEN
          EXTRACT(DAY FROM updated_at - created_at)
        END
      ), 0) as average_sales_cycle
    FROM public.opportunities
    WHERE company_id = $1 ${ownerId ? 'AND owner_id = $2' : ''}
  `;

  console.log('📝 [Repository] Pipeline Query:', pipelineQuery);
  console.log('📝 [Repository] Metrics Query:', metricsQuery);

  try {
    console.log('⏳ [Repository] Executing queries...');
    const startTime = Date.now();

    // Execute both queries in parallel
    const [pipelineResult, metricsResult] = await Promise.all([
      db.query(pipelineQuery, params).catch(err => {
        console.error('❌ [Repository] Pipeline query failed:', err);
        console.error('❌ [Repository] Pipeline query error details:', {
          message: err.message,
          code: err.code,
          detail: err.detail,
          hint: err.hint,
          position: err.position,
          where: err.where,
          schema: err.schema,
          table: err.table,
          column: err.column
        });
        throw err;
      }),
      db.query(metricsQuery, params).catch(err => {
        console.error('❌ [Repository] Metrics query failed:', err);
        console.error('❌ [Repository] Metrics query error details:', {
          message: err.message,
          code: err.code,
          detail: err.detail,
          hint: err.hint
        });
        throw err;
      })
    ]);

    const endTime = Date.now();
    console.log(`⏱️ [Repository] Queries executed in ${endTime - startTime}ms`);

    console.log('✅ [Repository] Pipeline result:', {
      rowCount: pipelineResult?.rows?.length || 0,
      firstRow: pipelineResult?.rows?.[0]
    });

    console.log('✅ [Repository] Metrics result:', {
      hasRows: !!metricsResult?.rows?.[0],
      metrics: metricsResult?.rows?.[0]
    });

    const metrics = metricsResult?.rows?.[0] || {};

    const result = {
      stages: pipelineResult?.rows?.map(stage => ({
        ...stage,
        total_amount: parseFloat(stage.total_amount),
        weighted_amount: parseFloat(stage.weighted_amount)
      })) || [],
      total_opportunities: parseInt(metrics.total_opportunities) || 0,
      total_value: parseFloat(metrics.total_value) || 0,
      weighted_value: parseFloat(metrics.weighted_value) || 0,
      average_deal_size: parseFloat(metrics.average_deal_size) || 0,
      conversion_rate: parseFloat(metrics.conversion_rate) || 0,
      average_sales_cycle: parseFloat(metrics.average_sales_cycle) || 0
    };

    console.log('📦 [Repository] Final result:', {
      stagesCount: result.stages.length,
      totalOpportunities: result.total_opportunities,
      totalValue: result.total_value
    });

    return result;

  } catch (error) {
    console.error('============================================');
    console.error('🔥 [Repository] FATAL ERROR in getPipelineMetrics');
    console.error('============================================');
    console.error('❌ [Repository] Error:', error);
    console.error('❌ [Repository] Error message:', error.message);
    console.error('❌ [Repository] Error stack:', error.stack);

    // Log specific database error information
    if (error.code) {
      console.error('🗄️ [Repository] Database error code:', error.code);
      console.error('🗄️ [Repository] Database error detail:', error.detail);
      console.error('🗄️ [Repository] Database error hint:', error.hint);
      console.error('🗄️ [Repository] Database error position:', error.position);
      console.error('🗄️ [Repository] Database error where:', error.where);
    }

    throw error;
  }
}