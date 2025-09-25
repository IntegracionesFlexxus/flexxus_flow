// useApprovalNotifications - Real-time notifications hook
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalNotification } from '../../shared/types';
import { approvalService } from '../services/approvalService';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

interface NotificationFilters {
  unreadOnly?: boolean;
  type?: string[];
  limit?: number;
}

interface UseApprovalNotificationsReturn {
  // State
  notifications: ApprovalNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  loadNotifications: (filters?: NotificationFilters) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  subscribeToUpdates: () => () => void;
  refreshNotifications: () => void;

  // Notification handlers
  showBrowserNotification: (notification: ApprovalNotification) => void;
  playNotificationSound: () => void;
}

export const useApprovalNotifications = (
  initialFilters: NotificationFilters = {}
): UseApprovalNotificationsReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

  const NOTIFICATIONS_KEY = ['approval-notifications', filters];

  // Check browser notification permissions
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setBrowserNotificationsEnabled(true);
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setBrowserNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, []);

  // Notifications query
  const {
    data: notifications = [],
    isLoading,
    error: queryError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => approvalService.getApprovalNotifications(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60000 // Refetch every minute as fallback
  });

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket('/ws/approval-notifications', {
    onMessage: (notification) => {
      handleRealTimeNotification(notification);
    },
    onError: (error) => {
      console.error('Notification WebSocket error:', error);
    },
    reconnectAttempts: 5,
    reconnectInterval: 3000
  });

  // Handle real-time notifications
  const handleRealTimeNotification = useCallback((notification: ApprovalNotification) => {
    // Add to cache
    queryClient.setQueryData(NOTIFICATIONS_KEY, (oldData: ApprovalNotification[] = []) => {
      return [notification, ...oldData];
    });

    // Show browser notification if enabled
    if (browserNotificationsEnabled) {
      showBrowserNotification(notification);
    }

    // Play sound if enabled
    if (audioEnabled) {
      playNotificationSound();
    }

    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('approval-notification', { detail: notification }));
  }, [queryClient, NOTIFICATIONS_KEY, browserNotificationsEnabled, audioEnabled]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => approvalService.markNotificationRead(notificationId),
    onSuccess: (_, notificationId) => {
      // Update cache
      queryClient.setQueryData(NOTIFICATIONS_KEY, (oldData: ApprovalNotification[] = []) => {
        return oldData.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        );
      });
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => approvalService.markAllNotificationsRead(),
    onSuccess: () => {
      // Update cache
      queryClient.setQueryData(NOTIFICATIONS_KEY, (oldData: ApprovalNotification[] = []) => {
        return oldData.map(notification => ({ ...notification, isRead: true }));
      });
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error);
    }
  });

  // Delete notification mutation (if supported by API)
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => {
      // Assuming there's a delete endpoint
      return fetch(`/api/crm/approvals/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
    },
    onSuccess: (_, notificationId) => {
      // Remove from cache
      queryClient.setQueryData(NOTIFICATIONS_KEY, (oldData: ApprovalNotification[] = []) => {
        return oldData.filter(notification => notification.id !== notificationId);
      });
    },
    onError: (error) => {
      console.error('Failed to delete notification:', error);
    }
  });

  // Action functions
  const loadNotifications = useCallback(async (newFilters?: NotificationFilters) => {
    if (newFilters) {
      setFilters(newFilters);
    }
    await refetchNotifications();
  }, [refetchNotifications]);

  const markAsRead = useCallback(async (notificationId: number) => {
    await markAsReadMutation.mutateAsync(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback(async (notificationId: number) => {
    await deleteNotificationMutation.mutateAsync(notificationId);
  }, [deleteNotificationMutation]);

  const subscribeToUpdates = useCallback(() => {
    // This is handled by the WebSocket connection
    // Return cleanup function
    return () => {
      // Cleanup if needed
    };
  }, []);

  const refreshNotifications = useCallback(() => {
    refetchNotifications();
  }, [refetchNotifications]);

  const showBrowserNotification = useCallback((notification: ApprovalNotification) => {
    if (!browserNotificationsEnabled || !('Notification' in window)) return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `approval-${notification.id}`,
      requireInteraction: notification.type === 'approval_request',
      actions: notification.actionUrl ? [
        {
          action: 'view',
          title: 'View'
        }
      ] : undefined
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close after 10 seconds for non-urgent notifications
    if (notification.type !== 'approval_request') {
      setTimeout(() => {
        browserNotification.close();
      }, 10000);
    }
  }, [browserNotificationsEnabled]);

  const playNotificationSound = useCallback(() => {
    if (!audioEnabled) return;

    // Create audio element and play notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(error => {
      console.warn('Could not play notification sound:', error);
    });
  }, [audioEnabled]);

  // Auto-refresh on filter changes
  useEffect(() => {
    refetchNotifications();
  }, [filters, refetchNotifications]);

  // Compute derived state
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const loading = isLoading ||
                 markAsReadMutation.isPending ||
                 markAllAsReadMutation.isPending ||
                 deleteNotificationMutation.isPending;

  const error = queryError?.message ||
               markAsReadMutation.error?.message ||
               markAllAsReadMutation.error?.message ||
               deleteNotificationMutation.error?.message ||
               null;

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,

    // Actions
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeToUpdates,
    refreshNotifications,

    // Notification handlers
    showBrowserNotification,
    playNotificationSound
  };
};

// Hook for listening to approval notification events
export const useApprovalNotificationListener = (
  callback: (notification: ApprovalNotification) => void
) => {
  useEffect(() => {
    const handleNotification = (event: CustomEvent<ApprovalNotification>) => {
      callback(event.detail);
    };

    window.addEventListener('approval-notification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('approval-notification', handleNotification as EventListener);
    };
  }, [callback]);
};

// Hook for notification preferences
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    browser: true,
    sound: true,
    email: true,
    slack: false
  });

  const updatePreferences = useCallback((newPreferences: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    // Save to localStorage or API
    localStorage.setItem('approval-notification-preferences', JSON.stringify({
      ...preferences,
      ...newPreferences
    }));
  }, [preferences]);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('approval-notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.warn('Could not load notification preferences:', error);
      }
    }
  }, []);

  return {
    preferences,
    updatePreferences
  };
};