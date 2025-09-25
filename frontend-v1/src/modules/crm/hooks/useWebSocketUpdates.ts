/**
 * WebSocket Updates Hook
 * Manages real-time updates for pipeline operations
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import usePipelineStore from '../stores/usePipelineStore';
import useForecastStore from '../stores/useForecastStore';
import { useNotification } from '../../../shared/hooks/useNotification';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
}

const DEFAULT_WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

export const useWebSocketUpdates = (options: WebSocketOptions = {}) => {
  const {
    url = DEFAULT_WS_URL,
    autoConnect = true,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    reconnectionAttempts = 5
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    connectionError: null
  });

  const { showNotification } = useNotification();
  const {
    updateOpportunity,
    loadOpportunities,
    loadMetrics,
    currentPipeline
  } = usePipelineStore();

  const {
    loadSnapshots,
    loadSummary,
    currentPeriod
  } = useForecastStore();

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isReconnecting: false, connectionError: null }));

    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false, // We'll handle reconnection manually
      auth: {
        token: localStorage.getItem('authToken')
      }
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setState({
        isConnected: true,
        isReconnecting: false,
        connectionError: null
      });
      reconnectAttemptsRef.current = 0;

      // Subscribe to pipeline updates if we have a current pipeline
      if (currentPipeline) {
        socket.emit('subscribe:pipeline', currentPipeline.pipeline_id);
      }

      // Subscribe to forecast updates if we have a current period
      if (currentPeriod) {
        socket.emit('subscribe:forecast', currentPeriod.period_id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));

      // Attempt reconnection if not intentional disconnect
      if (reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionError: error.message
      }));
      attemptReconnect();
    });

    // Business event handlers
    socket.on('opportunity:moved', (data: {
      opportunity_id: string;
      from_stage_id: number;
      to_stage_id: number;
      moved_by: string;
    }) => {
      // Update local state
      updateOpportunity(data.opportunity_id, { stage_id: data.to_stage_id });

      // Show notification if not moved by current user
      const currentUser = localStorage.getItem('userId');
      if (data.moved_by !== currentUser) {
        showNotification('info', `Opportunity moved to new stage by ${data.moved_by}`);
      }
    });

    socket.on('opportunity:updated', (data: {
      opportunity_id: string;
      updates: any;
      updated_by: string;
    }) => {
      // Update local state
      updateOpportunity(data.opportunity_id, data.updates);
    });

    socket.on('pipeline:updated', (data: {
      pipeline_id: number;
      updates: any;
    }) => {
      if (currentPipeline?.pipeline_id === data.pipeline_id) {
        // Reload pipeline data
        loadOpportunities(data.pipeline_id);
      }
    });

    socket.on('metrics:refreshed', (data: {
      pipeline_id: number;
    }) => {
      if (currentPipeline?.pipeline_id === data.pipeline_id) {
        loadMetrics(data.pipeline_id, true);
      }
    });

    socket.on('forecast:updated', (data: {
      period_id: number;
      type: 'snapshot_created' | 'snapshot_updated' | 'accuracy_calculated';
    }) => {
      if (currentPeriod?.period_id === data.period_id) {
        switch (data.type) {
          case 'snapshot_created':
          case 'snapshot_updated':
            loadSnapshots(data.period_id);
            break;
          case 'accuracy_calculated':
            loadSummary(data.period_id);
            break;
        }
      }
    });

    socket.on('notification', (data: {
      type: 'info' | 'warning' | 'success' | 'error';
      message: string;
    }) => {
      showNotification(data.type, data.message);
    });

    socketRef.current = socket;
  }, [
    url,
    currentPipeline,
    currentPeriod,
    updateOpportunity,
    loadOpportunities,
    loadMetrics,
    loadSnapshots,
    loadSummary,
    showNotification
  ]);

  // Reconnection logic
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= reconnectionAttempts) {
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        connectionError: 'Max reconnection attempts reached'
      }));
      return;
    }

    setState(prev => ({ ...prev, isReconnecting: true }));
    reconnectAttemptsRef.current++;

    const delay = Math.min(
      reconnectionDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
      reconnectionDelayMax
    );

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}`);
      connect();
    }, delay);
  }, [reconnectionDelay, reconnectionDelayMax, reconnectionAttempts, connect]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({
      isConnected: false,
      isReconnecting: false,
      connectionError: null
    });
  }, []);

  // Emit custom event
  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected, cannot emit event:', event);
      return;
    }

    socketRef.current.emit(event, data);
  }, []);

  // Subscribe to pipeline updates
  const subscribeToPipeline = useCallback((pipelineId: number) => {
    emit('subscribe:pipeline', pipelineId);
  }, [emit]);

  // Unsubscribe from pipeline updates
  const unsubscribeFromPipeline = useCallback((pipelineId: number) => {
    emit('unsubscribe:pipeline', pipelineId);
  }, [emit]);

  // Subscribe to forecast updates
  const subscribeToForecast = useCallback((periodId: number) => {
    emit('subscribe:forecast', periodId);
  }, [emit]);

  // Unsubscribe from forecast updates
  const unsubscribeFromForecast = useCallback((periodId: number) => {
    emit('unsubscribe:forecast', periodId);
  }, [emit]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run once on mount/unmount

  // Subscribe to pipeline changes
  useEffect(() => {
    if (socketRef.current?.connected && currentPipeline) {
      subscribeToPipeline(currentPipeline.pipeline_id);

      return () => {
        unsubscribeFromPipeline(currentPipeline.pipeline_id);
      };
    }
  }, [currentPipeline, state.isConnected, subscribeToPipeline, unsubscribeFromPipeline]);

  // Subscribe to forecast changes
  useEffect(() => {
    if (socketRef.current?.connected && currentPeriod) {
      subscribeToForecast(currentPeriod.period_id);

      return () => {
        unsubscribeFromForecast(currentPeriod.period_id);
      };
    }
  }, [currentPeriod, state.isConnected, subscribeToForecast, unsubscribeFromForecast]);

  return {
    // State
    ...state,

    // Actions
    connect,
    disconnect,
    emit,

    // Subscriptions
    subscribeToPipeline,
    unsubscribeFromPipeline,
    subscribeToForecast,
    unsubscribeFromForecast
  };
};

export default useWebSocketUpdates;