// Real-Time Pricing Hook - Sprint 19 Phase 3
// WebSocket-based real-time pricing updates with < 300ms response

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePricingStore } from '../../../../stores/pricingStore';
import {
  PriceResult,
  PriceCalculationParams
} from '../../../shared/types/pricing.types';

interface RealTimePriceUpdate {
  productId: number;
  variantId?: number;
  price: PriceResult;
  timestamp: number;
  changeType: 'rule_update' | 'inventory_change' | 'demand_change' | 'manual_override';
  metadata?: Record<string, any>;
}

interface ProductSubscription {
  productId: number;
  variantId?: number;
  callback: (update: RealTimePriceUpdate) => void;
  lastUpdate?: number;
}

interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  error: string | null;
  lastConnected?: number;
  reconnectAttempts: number;
}

interface UseRealTimePricingReturn {
  // Connection status
  connectionStatus: ConnectionStatus;

  // Subscription management
  subscribeToProduct: (productId: number, callback: (update: RealTimePriceUpdate) => void, variantId?: number) => () => void;
  subscribeToProducts: (productIds: number[], callback: (update: RealTimePriceUpdate) => void) => () => void;
  unsubscribeFromProduct: (productId: number, variantId?: number) => void;
  unsubscribeAll: () => void;

  // Active subscriptions
  activeSubscriptions: ProductSubscription[];
  subscriptionCount: number;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Real-time price requests
  requestPriceUpdate: (params: PriceCalculationParams) => Promise<PriceResult>;

  // Performance metrics
  latency: number;
  updateFrequency: number;
  messagesReceived: number;

  // Utilities
  isSubscribed: (productId: number, variantId?: number) => boolean;
  getLastUpdate: (productId: number, variantId?: number) => RealTimePriceUpdate | null;
}

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws/pricing';
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const useRealTimePricing = (): UseRealTimePricingReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    reconnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const [activeSubscriptions, setActiveSubscriptions] = useState<ProductSubscription[]>([]);
  const [latency, setLatency] = useState(0);
  const [updateFrequency, setUpdateFrequency] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [lastUpdates, setLastUpdates] = useState<Map<string, RealTimePriceUpdate>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  const { enableRealTimePricing, disableRealTimePricing, realTimePricing } = usePricingStore();

  // Generate subscription key
  const getSubscriptionKey = (productId: number, variantId?: number): string => {
    return variantId ? `${productId}:${variantId}` : `${productId}`;
  };

  // Calculate update frequency
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - lastUpdateTimeRef.current;
      const updatesInPeriod = updateCountRef.current;

      if (timeDiff > 0) {
        setUpdateFrequency(Math.round((updatesInPeriod / (timeDiff / 1000)) * 100) / 100);
      }

      // Reset counters
      updateCountRef.current = 0;
      lastUpdateTimeRef.current = now;
    }, 10000); // Calculate every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // WebSocket connection setup
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus(prev => ({
      ...prev,
      connecting: true,
      error: null
    }));

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Real-time pricing WebSocket connected');
        setConnectionStatus({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
          lastConnected: Date.now(),
          reconnectAttempts: 0
        });

        // Enable real-time pricing in store
        enableRealTimePricing();

        // Start heartbeat
        startHeartbeat();

        // Re-subscribe to all active subscriptions
        activeSubscriptions.forEach(sub => {
          sendSubscription(sub.productId, sub.variantId, true);
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Real-time pricing WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false
        }));

        disableRealTimePricing();
        stopHeartbeat();

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && connectionStatus.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnection();
        }
      };

      ws.onerror = (error) => {
        console.error('Real-time pricing WebSocket error:', error);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'Connection failed'
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus(prev => ({
        ...prev,
        connecting: false,
        error: 'Failed to create connection'
      }));
    }
  }, [activeSubscriptions, connectionStatus.reconnectAttempts, enableRealTimePricing, disableRealTimePricing]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();
    disableRealTimePricing();

    setConnectionStatus({
      connected: false,
      connecting: false,
      reconnecting: false,
      error: null,
      reconnectAttempts: 0
    });
  }, [disableRealTimePricing]);

  // Reconnect WebSocket
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Schedule reconnection
  const scheduleReconnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus(prev => ({
      ...prev,
      reconnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect... (attempt ${connectionStatus.reconnectAttempts + 1})`);
      connect();
    }, RECONNECT_INTERVAL);
  }, [connect, connectionStatus.reconnectAttempts]);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Handle WebSocket messages
  const handleMessage = useCallback((data: any) => {
    setMessagesReceived(prev => prev + 1);
    updateCountRef.current += 1;

    switch (data.type) {
      case 'pong':
        // Calculate latency
        const currentLatency = Date.now() - pingTimeRef.current;
        setLatency(currentLatency);
        break;

      case 'price_update':
        const update: RealTimePriceUpdate = {
          productId: data.productId,
          variantId: data.variantId,
          price: data.price,
          timestamp: data.timestamp || Date.now(),
          changeType: data.changeType || 'rule_update',
          metadata: data.metadata
        };

        // Store last update
        const key = getSubscriptionKey(update.productId, update.variantId);
        setLastUpdates(prev => new Map(prev.set(key, update)));

        // Notify subscribers
        activeSubscriptions.forEach(sub => {
          if (sub.productId === update.productId &&
              (sub.variantId === update.variantId || (!sub.variantId && !update.variantId))) {
            sub.callback(update);
          }
        });
        break;

      case 'error':
        console.error('WebSocket error message:', data.message);
        setConnectionStatus(prev => ({
          ...prev,
          error: data.message
        }));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }, [activeSubscriptions]);

  // Send subscription message
  const sendSubscription = useCallback((productId: number, variantId?: number, subscribe: boolean = true) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: subscribe ? 'subscribe' : 'unsubscribe',
        productId,
        variantId
      };

      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Subscribe to product price updates
  const subscribeToProduct = useCallback((
    productId: number,
    callback: (update: RealTimePriceUpdate) => void,
    variantId?: number
  ): (() => void) => {
    const subscription: ProductSubscription = {
      productId,
      variantId,
      callback
    };

    setActiveSubscriptions(prev => [...prev, subscription]);

    // Send subscription to WebSocket if connected
    if (connectionStatus.connected) {
      sendSubscription(productId, variantId, true);
    }

    // Return unsubscribe function
    return () => {
      unsubscribeFromProduct(productId, variantId);
    };
  }, [connectionStatus.connected, sendSubscription]);

  // Subscribe to multiple products
  const subscribeToProducts = useCallback((
    productIds: number[],
    callback: (update: RealTimePriceUpdate) => void
  ): (() => void) => {
    const unsubscribeFunctions = productIds.map(productId =>
      subscribeToProduct(productId, callback)
    );

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [subscribeToProduct]);

  // Unsubscribe from product
  const unsubscribeFromProduct = useCallback((productId: number, variantId?: number) => {
    setActiveSubscriptions(prev =>
      prev.filter(sub =>
        !(sub.productId === productId && sub.variantId === variantId)
      )
    );

    // Send unsubscription to WebSocket if connected
    if (connectionStatus.connected) {
      sendSubscription(productId, variantId, false);
    }

    // Remove from last updates
    const key = getSubscriptionKey(productId, variantId);
    setLastUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, [connectionStatus.connected, sendSubscription]);

  // Unsubscribe from all products
  const unsubscribeAll = useCallback(() => {
    activeSubscriptions.forEach(sub => {
      if (connectionStatus.connected) {
        sendSubscription(sub.productId, sub.variantId, false);
      }
    });

    setActiveSubscriptions([]);
    setLastUpdates(new Map());
  }, [activeSubscriptions, connectionStatus.connected, sendSubscription]);

  // Request immediate price update
  const requestPriceUpdate = useCallback(async (
    params: PriceCalculationParams
  ): Promise<PriceResult> => {
    return new Promise((resolve, reject) => {
      if (!connectionStatus.connected || !wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = Math.random().toString(36).substr(2, 9);
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      // Listen for response
      const handleResponse = (data: any) => {
        if (data.type === 'price_response' && data.requestId === requestId) {
          clearTimeout(timeout);
          wsRef.current?.removeEventListener('message', handleResponse);
          resolve(data.price);
        }
      };

      wsRef.current.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        handleResponse(data);
      });

      // Send request
      const message = {
        type: 'price_request',
        requestId,
        params
      };

      wsRef.current.send(JSON.stringify(message));
    });
  }, [connectionStatus.connected]);

  // Utility functions
  const isSubscribed = useCallback((productId: number, variantId?: number): boolean => {
    return activeSubscriptions.some(sub =>
      sub.productId === productId && sub.variantId === variantId
    );
  }, [activeSubscriptions]);

  const getLastUpdate = useCallback((productId: number, variantId?: number): RealTimePriceUpdate | null => {
    const key = getSubscriptionKey(productId, variantId);
    return lastUpdates.get(key) || null;
  }, [lastUpdates]);

  // Auto-connect on mount if real-time pricing is enabled
  useEffect(() => {
    if (realTimePricing && !connectionStatus.connected && !connectionStatus.connecting) {
      connect();
    }
  }, [realTimePricing, connectionStatus.connected, connectionStatus.connecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection status
    connectionStatus,

    // Subscription management
    subscribeToProduct,
    subscribeToProducts,
    unsubscribeFromProduct,
    unsubscribeAll,

    // Active subscriptions
    activeSubscriptions,
    subscriptionCount: activeSubscriptions.length,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Real-time price requests
    requestPriceUpdate,

    // Performance metrics
    latency,
    updateFrequency,
    messagesReceived,

    // Utilities
    isSubscribed,
    getLastUpdate
  };
};

export default useRealTimePricing;