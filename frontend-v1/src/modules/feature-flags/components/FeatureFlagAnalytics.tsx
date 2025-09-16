/**
 * Feature Flag Analytics Component - Sprint 3
 * Componente para mostrar analytics de feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Card } from '@/components/ui/Card';
import { LoadingOverlay } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/badge';
import { featureFlagService, FeatureFlagAnalytics as AnalyticsData } from '@modules/feature-flags/services/featureFlagService';

interface FeatureFlagAnalyticsProps {
  open: boolean;
  onClose: () => void;
}

export const FeatureFlagAnalytics: React.FC<FeatureFlagAnalyticsProps> = ({ open, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadAnalytics();
    }
  }, [open]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await featureFlagService.getAnalytics();
      setAnalytics(response.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <LoadingOverlay />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Feature Flag Analytics</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-96 overflow-y-auto">
          {analytics.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No analytics data available
            </div>
          ) : (
            analytics.map(data => (
              <Card key={data.flagName} className="p-4">
                <div className="mb-4">
                  <h3 className="font-semibold">{data.flagName}</h3>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>Period: {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.evaluations.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Evaluations</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold">{data.uniqueUsers.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Unique Users</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold">{Math.round(data.cacheHitRate * 100)}%</div>
                    <div className="text-sm text-gray-600">Cache Hit Rate</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold">{data.averageEvaluationTime.toFixed(2)}ms</div>
                    <div className="text-sm text-gray-600">Avg Evaluation Time</div>
                  </div>
                </div>

                {Object.keys(data.variations).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Variations</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.variations).map(([variation, count]) => (
                        <Badge key={variation} variant="secondary">
                          {variation}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {data.errorRate > 0 && (
                  <div className="mt-2 text-red-600 text-sm">
                    Error Rate: {Math.round(data.errorRate * 100)}%
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};