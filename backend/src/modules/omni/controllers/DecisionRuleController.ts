/**
 * Decision Rule Controller - Sprint 12 Fase 2
 * REST API endpoints for decision rule management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { DecisionRuleService } from '../automation/rules/DecisionRuleService';

@injectable()
export class DecisionRuleController {
  constructor(
    @inject(TYPES.DecisionRuleService)
    private ruleService: DecisionRuleService
  ) {}

  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { rule_name, rule_type, conditions, actions, ml_model_id, confidence_threshold, priority } = req.body;

      if (!rule_name || !rule_type || !conditions || !actions) {
        res.status(400).json({
          success: false,
          error: 'rule_name, rule_type, conditions, and actions are required'
        });
        return;
      }

      const rule = await this.ruleService.createRule(
        tenantId,
        rule_name,
        rule_type,
        conditions,
        actions,
        { mlModelId: ml_model_id, confidenceThreshold: confidence_threshold, priority }
      );

      res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const rule = await this.ruleService.getRule(id, tenantId);

      res.status(200).json({ success: true, data: rule });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async listRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const activeOnly = req.query.active_only !== 'false';

      const rules = await this.ruleService.listRules(tenantId, activeOnly);

      res.status(200).json({ success: true, data: rules, count: rules.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updateData = req.body;

      const rule = await this.ruleService.updateRule(id, tenantId, updateData);

      res.status(200).json({ success: true, data: rule });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.ruleService.deleteRule(id, tenantId);

      res.status(200).json({ success: true, message: 'Rule deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async activateRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.ruleService.activateRule(id, tenantId);

      res.status(200).json({ success: true, message: 'Rule activated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deactivateRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.ruleService.deactivateRule(id, tenantId);

      res.status(200).json({ success: true, message: 'Rule deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async evaluateRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { context } = req.body;

      if (!context) {
        res.status(400).json({ success: false, error: 'context is required' });
        return;
      }

      const result = await this.ruleService.evaluateRules(context, tenantId);

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
