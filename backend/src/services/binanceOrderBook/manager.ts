import { DepthSubscription, DepthUpdate, subscribeDepth } from "../../services/binanceStream";
import { fetchSnapshot } from "./snapshot";
import {
  isObsoleteUpdate,
  isBridgingUpdate,
  isGapDetected,
  applyUpdate,
} from "./logic";
import { OrderBookManager, OrderBookState, OrderBookListeners } from "./types";

const DEFAULT_LIMIT = 1_000;

export function createOrderBookManager(listeners: OrderBookListeners): OrderBookManager {
  let orderBookState: OrderBookState | null = null;
  let depthSubscription: DepthSubscription | null = null;
  let activeSymbol: string | null = null;
  let activeLimit = DEFAULT_LIMIT;
  let bufferedUpdates: DepthUpdate[] = [];
  let snapshotReady = false;
  let isSynced = false;
  let resyncPromise: Promise<void> | null = null;

  const broadcastCurrentState = () => {
    if (orderBookState) listeners.onBroadcast(orderBookState);
  };

  function processDepthUpdate(update: DepthUpdate) {
    if (!orderBookState) return;
    if (isObsoleteUpdate(update, orderBookState.lastUpdateId)) return;

    if (!isSynced) {
      if (isBridgingUpdate(update, orderBookState.lastUpdateId)) {
        applyUpdate(orderBookState, update);
        isSynced = true;
        broadcastCurrentState();
      }
      return;
    }

    if (isGapDetected(update, orderBookState.lastUpdateId)) {
      console.warn(`⚠️ Out of sync. Expected ${orderBookState.lastUpdateId + 1}, got [${update.U}, ${update.u}]`);
      triggerResync();
      return;
    }

    applyUpdate(orderBookState, update);
    broadcastCurrentState();
  }

  const processBufferedUpdates = () => {
    const pending = bufferedUpdates;
    bufferedUpdates = [];
    pending.forEach(processDepthUpdate);
  };

  const synchronizeOrderBook = async (symbol: string, limit: number) => {
    try {
      orderBookState = await fetchSnapshot(symbol, limit);
      snapshotReady = true;
      processBufferedUpdates();
    } catch (err) {
      snapshotReady = false;
      listeners.onError?.(err);
      throw err;
    }
  };

  const triggerResync = () => {
    snapshotReady = false;
    isSynced = false;
    bufferedUpdates = [];
    if (!activeSymbol) return;
    if (!resyncPromise) {
      resyncPromise = synchronizeOrderBook(activeSymbol, activeLimit)
        .catch(err => console.error("Failed to resync", err))
        .finally(() => { resyncPromise = null; });
    }
  };

  const ensureDepthSubscription = (symbol: string) => {
    depthSubscription?.close();
    depthSubscription = subscribeDepth(symbol, {
      onOpen: triggerResync,
      onMessage: (update) => snapshotReady ? processDepthUpdate(update) : bufferedUpdates.push(update),
      onClose: () => { snapshotReady = false; isSynced = false; },
      onError: (err) => listeners.onError?.(err),
    });
  };

  return {
    getState: () => orderBookState,
    shutdown: () => {
      depthSubscription?.close();
      depthSubscription = null;
      orderBookState = null;
      bufferedUpdates = [];
      snapshotReady = false;
      isSynced = false;
      resyncPromise = null;
      activeSymbol = null;
    },
    init: async (symbol: string, limit = DEFAULT_LIMIT) => {
      if (!Number.isFinite(limit) || limit <= 0 || limit > DEFAULT_LIMIT) {
        throw new Error("Invalid limit. Must be between 1 and 1000.");
      }

      if (activeSymbol !== symbol) {
        activeSymbol = symbol;
        activeLimit = limit;
        bufferedUpdates = [];
        snapshotReady = false;
        isSynced = false;
        ensureDepthSubscription(symbol);
      } else if (limit !== activeLimit) {
        activeLimit = limit;
        triggerResync();
      }

      if (!resyncPromise) {
        resyncPromise = synchronizeOrderBook(symbol, activeLimit)
          .catch(err => { console.error("Failed to sync", err); throw err; })
          .finally(() => { resyncPromise = null; });
      }

      await resyncPromise;
      if (!orderBookState) throw new Error("Failed to initialize order book");
      return orderBookState;
    },
  };
}
