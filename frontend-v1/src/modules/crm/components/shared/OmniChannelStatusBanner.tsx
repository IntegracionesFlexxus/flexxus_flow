/**
 * OmniChannel Status Banner Component
 *
 * OMNICHANNEL STATUS: Temporary banner for missing module
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Update or remove when module is ready
 */

import React, { useState } from 'react';
import { AlertCircle, X, Info } from 'lucide-react';
import { FEATURE_FLAGS, OMNICHANNEL_MESSAGES } from '../../config/features';

interface IOmniChannelStatusBannerProps {
  dismissible?: boolean;
  variant?: 'warning' | 'info';
  showDetails?: boolean;
}

export const OmniChannelStatusBanner: React.FC<IOmniChannelStatusBannerProps> = ({
  dismissible = true,
  variant = 'warning',
  showDetails = false
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // Don't show if OmniChannel is enabled or banner is dismissed
  if (FEATURE_FLAGS.OMNICHANNEL_INTEGRATION || isDismissed) {
    return null;
  }

  // Don't show if feature flag is disabled
  if (!FEATURE_FLAGS.SHOW_OMNICHANNEL_STATUS) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store in localStorage to persist dismissal
    localStorage.setItem('omnichannel_banner_dismissed', 'true');
  };

  const Icon = variant === 'warning' ? AlertCircle : Info;

  const styles = {
    banner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: variant === 'warning' ? '#fff3cd' : '#d1ecf1',
      borderBottom: `2px solid ${variant === 'warning' ? '#ffc107' : '#17a2b8'}`,
      color: variant === 'warning' ? '#856404' : '#0c5460',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    content: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
    },
    icon: {
      flexShrink: 0
    },
    message: {
      flex: 1
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    button: {
      background: 'none',
      border: 'none',
      color: 'inherit',
      cursor: 'pointer',
      textDecoration: 'underline',
      fontSize: '14px',
      padding: '4px 8px'
    },
    dismissButton: {
      background: 'none',
      border: 'none',
      color: 'inherit',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.7,
      transition: 'opacity 0.2s'
    },
    details: {
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: `1px solid ${variant === 'warning' ? '#ffeaa7' : '#bee5eb'}`,
      fontSize: '13px',
      lineHeight: '1.6'
    },
    list: {
      margin: '8px 0',
      paddingLeft: '20px'
    }
  };

  return (
    <div style={styles.banner}>
      <div style={{ flex: 1 }}>
        <div style={styles.content}>
          <Icon size={20} style={styles.icon} />
          <div style={styles.message}>
            <strong>{OMNICHANNEL_MESSAGES.BANNER_WARNING}</strong>
            {showDetails && (
              <>
                {' '}
                <button
                  style={styles.button}
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                >
                  {showMoreInfo ? 'Hide details' : 'Learn more'}
                </button>
              </>
            )}
          </div>
        </div>

        {showMoreInfo && (
          <div style={styles.details}>
            <p><strong>Currently Limited Features:</strong></p>
            <ul style={styles.list}>
              <li>Email engagement tracking is not available</li>
              <li>Website visitor tracking is disabled</li>
              <li>Chat conversation history is unavailable</li>
              <li>Automated lead capture from forms is pending</li>
              <li>Real-time scoring updates are using polling (30s intervals)</li>
              <li>Lead source verification is manual</li>
            </ul>
            <p><strong>Available Features:</strong></p>
            <ul style={styles.list}>
              <li>✓ Manual lead entry and import</li>
              <li>✓ Lead scoring based on demographic data</li>
              <li>✓ Duplicate detection and merging</li>
              <li>✓ Lead assignment and routing</li>
              <li>✓ Lead conversion to accounts/contacts/opportunities</li>
            </ul>
            <p>
              <em>The OmniChannel module is being developed by another team and will be integrated once ready.</em>
            </p>
          </div>
        )}
      </div>

      {dismissible && (
        <div style={styles.actions}>
          <button
            style={styles.dismissButton}
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

// Mini version for inline warnings
export const OmniChannelWarningBadge: React.FC<{ message?: string }> = ({
  message = 'OmniChannel Required'
}) => {
  if (FEATURE_FLAGS.OMNICHANNEL_INTEGRATION) {
    return null;
  }

  const styles = {
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '4px',
      color: '#856404',
      fontSize: '11px',
      fontWeight: 500
    }
  };

  return (
    <span style={styles.badge} title={OMNICHANNEL_MESSAGES.FEATURE_DISABLED}>
      <AlertCircle size={12} />
      {message}
    </span>
  );
};

export default OmniChannelStatusBanner;