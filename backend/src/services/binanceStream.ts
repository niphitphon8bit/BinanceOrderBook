import WebSocket from "ws";

const MIN_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 2_000;

export interface DepthUpdate {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  U: number;  // First update ID in event
  u: number;  // Final update ID in event
  b: string[][]; // Bids to update
  a: string[][]; // Asks to update
}

export type DepthHandler = (data: DepthUpdate) => void;

export interface DepthSubscription {
  close: () => void;
}

export interface DepthStreamHandlers {
  onMessage: DepthHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
}

export function subscribeDepth(symbol: string, handlers: DepthStreamHandlers): DepthSubscription {
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth@100ms`;
  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isClosed = false;

  const scheduleReconnect = () => {
    if (isClosed) return;
    const delay = MIN_RECONNECT_DELAY_MS + Math.random() * (MAX_RECONNECT_DELAY_MS - MIN_RECONNECT_DELAY_MS);
    console.warn(`⚠️  Binance WS closed. Reconnecting in ${Math.round(delay)}ms...`);
    reconnectTimeout = setTimeout(connect, delay);
  };

  const connect = () => {
    if (isClosed) return;

    ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.log(`📡 Connected to Binance WS: ${symbol}@depth@100ms`);
      handlers.onOpen?.();
    });

    ws.on("message", (msg) => {
      try {
        const data: DepthUpdate = JSON.parse(msg.toString());
        handlers.onMessage(data);
      } catch (err) {
        console.error("Failed to parse depth update", err);
      }
    });

    ws.on("error", (err) => {
      console.error("Binance WS error:", err);
      handlers.onError?.(err);
    });

    ws.on("close", () => {
      ws = null;
      handlers.onClose?.();
      scheduleReconnect();
    });
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  connect();

  return {
    close: () => {
      isClosed = true;
      clearReconnectTimeout();
      if (ws) {
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        ws = null;
      }
    },
  };
}
