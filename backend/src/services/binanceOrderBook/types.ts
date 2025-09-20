export interface OrderBookState {
  symbol: string;
  lastUpdateId: number;
  bids: Map<string, string>;
  asks: Map<string, string>;
}

export type OrderBookListeners = {
  onBroadcast: (state: OrderBookState) => void;
  onError?: (error: unknown) => void;
};

export interface OrderBookManager {
  init(symbol: string, limit?: number): Promise<OrderBookState>;
  getState(): OrderBookState | null;
  shutdown(): void;
}
