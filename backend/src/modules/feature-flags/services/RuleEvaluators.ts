import { FeatureFlagRule, FeatureFlagContext, RuleEvaluationResult } from '@/modules/feature-flags/services/EnhancedFeatureFlagService';
import { inject, injectable } from 'inversify';
import { TYPES } from '@/container/types';
export interface IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean;
  evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult>;
}
@injectable()
export class UserAttributeRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'user_attribute';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { attribute, operator, value } = rule.conditions;
    const userValue = context.userAttributes?.[attribute];
    if (userValue === undefined) {
      return { matched: false, reason: `User attribute '${attribute}' not found` };
    }
    let matched = false;
    switch (operator) {
      case 'equals':
        matched = userValue === value;
        break;
      case 'not_equals':
        matched = userValue !== value;
        break;
      case 'in':
        matched = Array.isArray(value) && value.includes(userValue);
        break;
      case 'not_in':
        matched = Array.isArray(value) && !value.includes(userValue);
        break;
      case 'contains':
        matched = typeof userValue === 'string' && typeof value === 'string' && userValue.includes(value);
        break;
      case 'starts_with':
        matched = typeof userValue === 'string' && typeof value === 'string' && userValue.startsWith(value);
        break;
      case 'ends_with':
        matched = typeof userValue === 'string' && typeof value === 'string' && userValue.endsWith(value);
        break;
      case 'gt':
        matched = Number(userValue) > Number(value);
        break;
      case 'gte':
        matched = Number(userValue) >= Number(value);
        break;
      case 'lt':
        matched = Number(userValue) < Number(value);
        break;
      case 'lte':
        matched = Number(userValue) <= Number(value);
        break;
      default:
        return { matched: false, reason: `Unknown operator: ${operator}` };
    }
    return {
      matched,
      reason: matched ? `User attribute ${attribute} ${operator} ${value}` : `User attribute condition not met`,
      metadata: { attribute, operator, userValue, expectedValue: value }
    };
  }
}
@injectable()
export class UserSegmentRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'user_segment';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { segments } = rule.conditions;
    const userRole = context.userRole;
    const userAttributes = context.userAttributes || {};
    if (!Array.isArray(segments)) {
      return { matched: false, reason: 'Invalid segments configuration' };
    }
    const matchedSegments = segments.filter(segment => {
      if (segment.type === 'role' && userRole) {
        return segment.values.includes(userRole);
      }
      if (segment.type === 'attribute' && segment.attribute) {
        const userValue = userAttributes[segment.attribute];
        return userValue !== undefined && segment.values.includes(userValue);
      }
      return false;
    });
    const matched = matchedSegments.length > 0;
    return {
      matched,
      reason: matched ? `User belongs to segments: ${matchedSegments.map(s => s.name).join(', ')}` : 'User not in any target segment',
      metadata: { matchedSegments: matchedSegments.map(s => s.name), userRole, userAttributes }
    };
  }
}
@injectable()
export class PercentageRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'percentage';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { percentage, seed } = rule.conditions;
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return { matched: false, reason: 'Invalid percentage value' };
    }
    const identifier = context.userId || context.sessionAttributes?.sessionId || 'anonymous';
    const hashInput = `${identifier}-${seed || 'default'}`;
    const hash = this.simpleHash(hashInput);
    const userPercentage = hash % 100;
    const matched = userPercentage < percentage;
    return {
      matched,
      reason: matched ? `User in ${percentage}% rollout` : `User not in ${percentage}% rollout`,
      metadata: { percentage, userPercentage, identifier, seed }
    };
  }
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
@injectable()
export class TimeWindowRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'time_window';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { start_time, end_time, timezone } = rule.conditions;
    const now = new Date();
    if (timezone) {
      now.toLocaleString('en-US', { timeZone: timezone });
    }
    const startTime = start_time ? new Date(start_time) : null;
    const endTime = end_time ? new Date(end_time) : null;
    let matched = true;
    let reason = 'Within time window';
    if (startTime && now < startTime) {
      matched = false;
      reason = 'Before start time';
    } else if (endTime && now > endTime) {
      matched = false;
      reason = 'After end time';
    }
    return {
      matched,
      reason,
      metadata: { currentTime: now.toISOString(), startTime: startTime?.toISOString(), endTime: endTime?.toISOString(), timezone }
    };
  }
}
@injectable()
export class GeoLocationRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'geo_location';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { countries, regions, cities } = rule.conditions;
    const userGeo = context.geoLocation;
    if (!userGeo) {
      return { matched: false, reason: 'No geo location data available' };
    }
    let matched = false;
    let matchType = '';
    if (countries && Array.isArray(countries) && userGeo.country) {
      matched = countries.includes(userGeo.country);
      matchType = 'country';
    } else if (regions && Array.isArray(regions) && userGeo.region) {
      matched = regions.includes(userGeo.region);
      matchType = 'region';
    } else if (cities && Array.isArray(cities) && userGeo.city) {
      matched = cities.includes(userGeo.city);
      matchType = 'city';
    }
    return {
      matched,
      reason: matched ? `User in allowed ${matchType}` : 'User not in allowed geo locations',
      metadata: { userGeo, allowedCountries: countries, allowedRegions: regions, allowedCities: cities, matchType }
    };
  }
}
@injectable()
export class DeviceRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'device';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { device_types, operating_systems, browsers } = rule.conditions;
    const deviceInfo = context.deviceInfo;
    if (!deviceInfo) {
      return { matched: false, reason: 'No device information available' };
    }
    let matched = false;
    const matchReasons: string[] = [];
    if (device_types && Array.isArray(device_types) && deviceInfo.type) {
      if (device_types.includes(deviceInfo.type)) {
        matched = true;
        matchReasons.push(`device type: ${deviceInfo.type}`);
      }
    }
    if (operating_systems && Array.isArray(operating_systems) && deviceInfo.os) {
      if (operating_systems.includes(deviceInfo.os)) {
        matched = true;
        matchReasons.push(`OS: ${deviceInfo.os}`);
      }
    }
    if (browsers && Array.isArray(browsers) && deviceInfo.browser) {
      if (browsers.includes(deviceInfo.browser)) {
        matched = true;
        matchReasons.push(`browser: ${deviceInfo.browser}`);
      }
    }
    if (!device_types && !operating_systems && !browsers) {
      return { matched: false, reason: 'No device criteria specified' };
    }
    return {
      matched,
      reason: matched ? `Device matches: ${matchReasons.join(', ')}` : 'Device does not match criteria',
      metadata: { deviceInfo, criteria: { device_types, operating_systems, browsers }, matchReasons }
    };
  }
}
@injectable()
export class CustomRuleEvaluator implements IRuleEvaluator {
  canEvaluate(rule: FeatureFlagRule): boolean {
    return rule.type === 'custom';
  }
  async evaluate(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    if (!this.canEvaluate(rule)) {
      return { matched: false, reason: 'Wrong rule type' };
    }
    const { script, expected_result } = rule.conditions;
    if (!script || typeof script !== 'string') {
      return { matched: false, reason: 'No custom script provided' };
    }
    try {
      const result = this.evaluateCustomScript(script, context);
      const matched = result === expected_result;
      return {
        matched,
        reason: matched ? 'Custom script evaluation successful' : `Custom script result (${result}) does not match expected (${expected_result})`,
        metadata: { script, result, expected_result, context: this.sanitizeContextForLogging(context) }
      };
    } catch (error) {
      return {
        matched: false,
        reason: `Custom script evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { script, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  private evaluateCustomScript(script: string, context: FeatureFlagContext): any {
    const safeContext = {
      userId: context.userId,
      companyId: context.companyId,
      userRole: context.userRole,
      userAttributes: context.userAttributes || {},
      deviceInfo: context.deviceInfo || {},
      geoLocation: context.geoLocation || {},
      sessionAttributes: context.sessionAttributes || {},
      requestMetadata: {
        timestamp: context.requestMetadata?.timestamp || new Date(),
        source: context.requestMetadata?.source
      }
    };
    const func = new Function('context', 'Math', 'Date', 'JSON', `
      "use strict";
      try {
        return (${script})(context);
      } catch (error) {
        throw new Error('Script execution failed: ' + error.message);
      }
    `);
    return func(safeContext, Math, Date, JSON);
  }
  private sanitizeContextForLogging(context: FeatureFlagContext) {
    return {
      hasUserId: !!context.userId,
      companyId: context.companyId,
      userRole: context.userRole,
      attributeCount: Object.keys(context.userAttributes || {}).length,
      hasDeviceInfo: !!context.deviceInfo,
      hasGeoLocation: !!context.geoLocation
    };
  }
}
@injectable()
export class RuleEvaluatorRegistry {
  private evaluators: IRuleEvaluator[] = [];
  constructor(
    @inject(TYPES.UserAttributeRuleEvaluator) userAttributeEvaluator: UserAttributeRuleEvaluator,
    @inject(TYPES.UserSegmentRuleEvaluator) userSegmentEvaluator: UserSegmentRuleEvaluator,
    @inject(TYPES.PercentageRuleEvaluator) percentageEvaluator: PercentageRuleEvaluator,
    @inject(TYPES.TimeWindowRuleEvaluator) timeWindowEvaluator: TimeWindowRuleEvaluator,
    @inject(TYPES.GeoLocationRuleEvaluator) geoLocationEvaluator: GeoLocationRuleEvaluator,
    @inject(TYPES.DeviceRuleEvaluator) deviceEvaluator: DeviceRuleEvaluator,
    @inject(TYPES.CustomRuleEvaluator) customEvaluator: CustomRuleEvaluator
  ) {
    this.evaluators = [
      userAttributeEvaluator,
      userSegmentEvaluator,
      percentageEvaluator,
      timeWindowEvaluator,
      geoLocationEvaluator,
      deviceEvaluator,
      customEvaluator
    ];
  }
  getEvaluator(rule: FeatureFlagRule): IRuleEvaluator | null {
    return this.evaluators.find(evaluator => evaluator.canEvaluate(rule)) || null;
  }
  async evaluateRule(rule: FeatureFlagRule, context: FeatureFlagContext): Promise<RuleEvaluationResult> {
    const evaluator = this.getEvaluator(rule);
    if (!evaluator) {
      return {
        matched: false,
        reason: `No evaluator found for rule type: ${rule.type}`,
        metadata: { ruleType: rule.type }
      };
    }
    return evaluator.evaluate(rule, context);
  }
  getSupportedRuleTypes(): string[] {
    return ['user_attribute', 'user_segment', 'percentage', 'time_window', 'geo_location', 'device', 'custom'];
  }
}
