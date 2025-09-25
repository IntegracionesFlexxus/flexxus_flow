/**
 * Pending Sync Indicator Component
 *
 * OMNICHANNEL STATUS: Shows sync status with missing module
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Connect to real sync status when ready
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { POLLING_INTERVALS } from '../../config/features';

interface IPendingSyncIndicatorProps {
  leadId?: number;
  status?: 'pending' | 'syncing' | 'synced' | 'error';
  lastSyncAttempt?: Date | string;
  nextSyncTime?: Date | string;
  errorMessage?: string;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

export const PendingSyncIndicator: React.FC<IPendingSyncIndicatorProps> = ({
  leadId,
  status = 'pending',
  lastSyncAttempt,
  nextSyncTime,
  errorMessage,
  size = 'small',
  showDetails = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeUntilSync, setTimeUntilSync] = useState<string>('');

  // Calculate time until next sync
  useEffect(() => {
    if (!nextSyncTime) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const next = new Date(nextSyncTime).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setTimeUntilSync('Syncing...');
        setIsAnimating(true);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeUntilSync(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextSyncTime]);

  // Simulate sync animation
  useEffect(() => {
    if (status === 'syncing') {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className={isAnimating ? 'animate-spin' : ''} />;
      case 'synced':
        return <CheckCircle />;
      case 'error':
        return <AlertCircle />;
      default:
        return <Clock />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'synced':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'syncing':
        return '#007bff';
      default:
        return '#ffc107';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'synced':
        return 'Synchronized';
      case 'error':
        return errorMessage || 'Sync failed';
      case 'syncing':
        return 'Synchronizing...';
      default:
        return 'Pending sync';
    }
  };

  const sizeMap = {
    small: { icon: 14, font: 11, padding: '2px 6px' },
    medium: { icon: 16, font: 13, padding: '4px 8px' },
    large: { icon: 20, font: 14, padding: '6px 12px' }
  };

  const currentSize = sizeMap[size];

  const styles = {
    container: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: currentSize.padding,
      backgroundColor: `${getColor()}20`,
      border: `1px solid ${getColor()}`,
      borderRadius: '4px',
      fontSize: `${currentSize.font}px`,
      color: getColor(),
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: currentSize.icon,
      height: currentSize.icon
    },
    message: {
      fontWeight: 500
    },
    details: {
      marginLeft: '4px',
      opacity: 0.8,
      fontSize: `${currentSize.font - 1}px`
    },
    tooltip: {
      position: 'relative' as const,
      display: 'inline-block'
    },
    tooltipText: {
      visibility: 'hidden' as const,
      backgroundColor: '#333',
      color: '#fff',
      textAlign: 'center' as const,
      padding: '8px 12px',
      borderRadius: '4px',
      position: 'absolute' as const,
      zIndex: 1000,
      bottom: '125%',
      left: '50%',
      transform: 'translateX(-50%)',
      whiteSpace: 'nowrap' as const,
      fontSize: '12px',
      opacity: 0,
      transition: 'opacity 0.3s'
    },
    tooltipVisible: {
      visibility: 'visible' as const,
      opacity: 0.95
    }
  };

  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipContent = () => {
    const lines = [`Status: ${status}`];

    if (lastSyncAttempt) {
      lines.push(`Last attempt: ${new Date(lastSyncAttempt).toLocaleString()}`);
    }

    if (nextSyncTime && status === 'pending') {
      lines.push(`Next sync in: ${timeUntilSync}`);
    }

    if (status === 'pending') {
      lines.push('Waiting for OmniChannel module');
    }

    return lines.join('\n');
  };

  const indicator = (
    <div
      style={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={styles.icon}>
        {getIcon()}
      </span>
      <span style={styles.message}>
        {getMessage()}
      </span>
      {showDetails && timeUntilSync && status === 'pending' && (
        <span style={styles.details}>
          ({timeUntilSync})
        </span>
      )}
    </div>
  );

  if (!showDetails) {
    return (
      <div style={styles.tooltip}>
        {indicator}
        <div style={{
          ...styles.tooltipText,
          ...(showTooltip ? styles.tooltipVisible : {})
        }}>
          {tooltipContent().split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    );
  }

  return indicator;
};

// Bulk sync indicator for multiple leads
export const BulkSyncStatus: React.FC<{
  totalLeads: number;
  pendingSync: number;
  syncedLeads: number;
  failedSync: number;
}> = ({
  totalLeads,
  pendingSync,
  syncedLeads,
  failedSync
}) => {
  const syncPercentage = totalLeads > 0
    ? Math.round((syncedLeads / totalLeads) * 100)
    : 0;

  const styles = {
    container: {
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #dee2e6',
      fontSize: '13px'
    },
    title: {
      fontWeight: 600,
      marginBottom: '8px',
      color: '#495057'
    },
    stats: {
      display: 'flex',
      gap: '16px',
      marginBottom: '8px'
    },
    stat: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28a745',
      transition: 'width 0.3s ease'
    },
    icon: {
      width: '14px',
      height: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        OmniChannel Sync Status
      </div>
      <div style={styles.stats}>
        <div style={styles.stat}>
          <Clock size={14} style={{ color: '#ffc107' }} />
          <span>Pending: {pendingSync}</span>
        </div>
        <div style={styles.stat}>
          <CheckCircle size={14} style={{ color: '#28a745' }} />
          <span>Synced: {syncedLeads}</span>
        </div>
        {failedSync > 0 && (
          <div style={styles.stat}>
            <AlertCircle size={14} style={{ color: '#dc3545' }} />
            <span>Failed: {failedSync}</span>
          </div>
        )}
      </div>
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${syncPercentage}%`
          }}
        />
      </div>
      <div style={{ marginTop: '4px', fontSize: '11px', color: '#6c757d' }}>
        {syncPercentage}% synchronized ({syncedLeads} of {totalLeads} leads)
      </div>
    </div>
  );
};

export default PendingSyncIndicator;