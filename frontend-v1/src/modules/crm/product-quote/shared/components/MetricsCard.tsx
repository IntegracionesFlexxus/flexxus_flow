// Metrics Card Component - Sprint 19 Frontend Implementation

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  DollarSign,
  Users,
  ShoppingCart,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  MoreHorizontal
} from 'lucide-react';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
    isPercentage?: boolean;
  };
  icon?: React.ReactNode;
  iconType?: 'revenue' | 'users' | 'orders' | 'quotes' | 'time' | 'status' | 'chart' | 'custom';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  error?: string;
  clickable?: boolean;
  onClick?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  className?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  iconType = 'chart',
  color = 'blue',
  size = 'md',
  loading = false,
  error,
  clickable = false,
  onClick,
  actions = [],
  className = ""
}) => {
  const getIconByType = () => {
    if (icon) return icon;

    switch (iconType) {
      case 'revenue':
        return <DollarSign className="h-full w-full" />;
      case 'users':
        return <Users className="h-full w-full" />;
      case 'orders':
        return <ShoppingCart className="h-full w-full" />;
      case 'quotes':
        return <FileText className="h-full w-full" />;
      case 'time':
        return <Clock className="h-full w-full" />;
      case 'status':
        return <CheckCircle className="h-full w-full" />;
      case 'chart':
      default:
        return <BarChart3 className="h-full w-full" />;
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        accent: 'border-l-blue-500'
      },
      green: {
        bg: 'bg-green-50',
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
        accent: 'border-l-green-500'
      },
      red: {
        bg: 'bg-red-50',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        accent: 'border-l-red-500'
      },
      yellow: {
        bg: 'bg-yellow-50',
        iconBg: 'bg-yellow-100',
        iconText: 'text-yellow-600',
        accent: 'border-l-yellow-500'
      },
      purple: {
        bg: 'bg-purple-50',
        iconBg: 'bg-purple-100',
        iconText: 'text-purple-600',
        accent: 'border-l-purple-500'
      },
      indigo: {
        bg: 'bg-indigo-50',
        iconBg: 'bg-indigo-100',
        iconText: 'text-indigo-600',
        accent: 'border-l-indigo-500'
      },
      gray: {
        bg: 'bg-gray-50',
        iconBg: 'bg-gray-100',
        iconText: 'text-gray-600',
        accent: 'border-l-gray-500'
      }
    };

    return colors[color];
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          card: 'p-4',
          iconContainer: 'h-8 w-8',
          value: 'text-xl',
          title: 'text-sm',
          subtitle: 'text-xs'
        };
      case 'lg':
        return {
          card: 'p-8',
          iconContainer: 'h-16 w-16',
          value: 'text-4xl',
          title: 'text-lg',
          subtitle: 'text-base'
        };
      case 'md':
      default:
        return {
          card: 'p-6',
          iconContainer: 'h-12 w-12',
          value: 'text-2xl',
          title: 'text-base',
          subtitle: 'text-sm'
        };
    }
  };

  const getChangeIcon = () => {
    if (!change) return null;

    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      case 'neutral':
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getChangeColorClass = () => {
    if (!change) return '';

    switch (change.type) {
      case 'increase':
        return 'text-green-600 bg-green-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      case 'neutral':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${sizeClasses.card} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className={`${sizeClasses.iconContainer} bg-gray-200 rounded-lg`}></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-red-200 rounded-lg ${sizeClasses.card} ${className}`}>
        <div className="flex items-center space-x-4">
          <div className={`${sizeClasses.iconContainer} bg-red-100 rounded-lg flex items-center justify-center`}>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg border-l-4 ${colorClasses.accent} ${sizeClasses.card}
        ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Icon */}
          <div className={`${sizeClasses.iconContainer} ${colorClasses.iconBg} rounded-lg flex items-center justify-center ${colorClasses.iconText}`}>
            {getIconByType()}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className={`${sizeClasses.title} font-medium text-gray-600 mb-1`}>
                {title}
              </p>

              {/* Actions Menu */}
              {actions.length > 0 && (
                <div className="relative group">
                  <button className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-baseline space-x-3">
              <p className={`${sizeClasses.value} font-bold text-gray-900`}>
                {formatValue(value)}
              </p>

              {change && (
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getChangeColorClass()}`}>
                  {getChangeIcon()}
                  <span>
                    {change.isPercentage !== false ? `${Math.abs(change.value)}%` : Math.abs(change.value)}
                  </span>
                  <span className="text-gray-500">
                    {change.period}
                  </span>
                </div>
              )}
            </div>

            {subtitle && (
              <p className={`${sizeClasses.subtitle} text-gray-500 mt-2`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* View Details Icon for Clickable Cards */}
        {clickable && (
          <div className="ml-4">
            <Eye className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard;