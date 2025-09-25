/**
 * Account Health Widget - Sprint 17
 * Displays account health score and metrics
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton,
  Grid
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAccountHealth } from '../../hooks/useAccountHealth';
import type { AccountHealthScore } from '../../types';

interface AccountHealthWidgetProps {
  accountId: number;
  compact?: boolean;
  showDetails?: boolean;
  onRefresh?: () => void;
}

export const AccountHealthWidget: React.FC<AccountHealthWidgetProps> = ({
  accountId,
  compact = false,
  showDetails = true,
  onRefresh
}) => {
  const {
    healthScore,
    loadingHealth,
    refetchHealth,
    getHealthGradeColor,
    getHealthTrendIcon,
    formatHealthScore
  } = useAccountHealth(accountId);

  if (loadingHealth) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Calculating health score...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              No health data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (healthScore.trend) {
      case 'improving':
        return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'declining':
        return <TrendingDownIcon sx={{ color: 'error.main' }} />;
      default:
        return <TrendingFlatIcon sx={{ color: 'warning.main' }} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const MetricBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="caption" fontWeight="bold">
          {Math.round((value / max) * 100)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(value / max) * 100}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            backgroundColor: getScoreColor(value).includes('.')
              ? getScoreColor(value)
              : `${getScoreColor(value)}.main`
          }
        }}
      />
    </Box>
  );

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={healthScore.overall_grade}
          size="small"
          sx={{
            backgroundColor: getHealthGradeColor(healthScore.overall_grade),
            color: 'white',
            fontWeight: 'bold'
          }}
        />
        <Typography variant="caption" color="textSecondary">
          {formatHealthScore(healthScore.overall_score)}
        </Typography>
        {getTrendIcon()}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Account Health
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Last calculated: ${new Date(healthScore.calculated_at).toLocaleDateString()}">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => {
                refetchHealth();
                onRefresh?.();
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Overall Score */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Typography
              variant="h2"
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${getHealthGradeColor(healthScore.overall_grade)} 0%, ${getHealthGradeColor(healthScore.overall_grade)}CC 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {healthScore.overall_grade}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Typography variant="h5" fontWeight="bold">
              {formatHealthScore(healthScore.overall_score)}
            </Typography>
            {getTrendIcon()}
          </Box>
          <Typography variant="caption" color="textSecondary">
            {healthScore.trend === 'improving' ? 'Improving' :
             healthScore.trend === 'declining' ? 'Declining' :
             'Stable'}
          </Typography>
        </Box>

        {/* Detailed Metrics */}
        {showDetails && (
          <>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
              Score Breakdown
            </Typography>

            <MetricBar label="Revenue" value={healthScore.revenue_score} />
            <MetricBar label="Engagement" value={healthScore.engagement_score} />
            <MetricBar label="Relationships" value={healthScore.relationship_score} />
            <MetricBar label="Product Adoption" value={healthScore.product_adoption_score} />
            <MetricBar label="Support" value={healthScore.support_score} />

            {/* Risk Factors */}
            {healthScore.risk_factors && healthScore.risk_factors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  Risk Factors
                </Typography>
                {healthScore.risk_factors.map((risk, index) => (
                  <Chip
                    key={index}
                    label={risk}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}

            {/* Opportunities */}
            {healthScore.opportunities && healthScore.opportunities.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  Opportunities
                </Typography>
                {healthScore.opportunities.map((opportunity, index) => (
                  <Chip
                    key={index}
                    label={opportunity}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}

            {/* Next Review */}
            {healthScore.next_review_date && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  Next Review: {new Date(healthScore.next_review_date).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountHealthWidget;