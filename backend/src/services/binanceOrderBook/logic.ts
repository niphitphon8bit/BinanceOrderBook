import { OrderBookState } from "./types";

export function toOrderMap(levels: string[][]): Map<string, string> {
  return new Map(levels.map(([price, qty]) => [price, qty]));
}

export function createState(
  symbol: string,
  lastUpdateId: number,
  bids: string[][],
  asks: string[][]
): OrderBookState {
  return {
    symbol,
    lastUpdateId,
    bids: toOrderMap(bids),
    asks: toOrderMap(asks),
  };
}

export function applyLevels(bookSide: Map<string, string>, updates: string[][]) {
  updates.forEach(([price, quantity]) => {
    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      bookSide.delete(price);
    } else {
      bookSide.set(price, quantity);
    }
  });
}

export function isObsoleteUpdate(update: any, lastUpdateId: number): boolean {
  return update.u <= lastUpdateId;
}

export function isBridgingUpdate(update: any, lastUpdateId: number): boolean {
  return update.U <= lastUpdateId + 1 && update.u >= lastUpdateId + 1;
}

export function isGapDetected(update: any, lastUpdateId: number): boolean {
  return update.U > lastUpdateId + 1;
}

export function applyUpdate(state: OrderBookState, update: any) {
  applyLevels(state.bids, update.b);
  applyLevels(state.asks, update.a);
  state.lastUpdateId = update.u;
}
