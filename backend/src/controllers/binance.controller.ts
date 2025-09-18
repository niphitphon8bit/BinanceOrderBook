import { Request, Response, NextFunction } from "express";
import { getOrderBook } from "../services/binanceService";
import { subscribeDepth } from "../services/binanceStream";

let localOrderBook: any = null;

export const getDepthSnapshot = async (req: Request, res: Response, next: NextFunction) => {
	// ref: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = req.query.limit ? Number(req.query.limit) : 1000;

    // 1. Fetch snapshot
    const snapshot = await getOrderBook(symbol, limit);
    localOrderBook = { ...snapshot, symbol };

    // 2. Start websocket subscription if not already running
    subscribeDepth(symbol, (update) => {
      if (!localOrderBook) return;

      // Only apply if update covers snapshot
      if (update.u <= localOrderBook.lastUpdateId) return;
      if (update.U <= localOrderBook.lastUpdateId + 1 && update.u >= localOrderBook.lastUpdateId + 1) {
        // Apply each bid update
        update.b.forEach(([price, qty]) => {
          if (qty === "0") {
            localOrderBook.bids = localOrderBook.bids.filter((b: string[]) => b[0] !== price);
          } else {
            const idx = localOrderBook.bids.findIndex((b: string[]) => b[0] === price);
            if (idx >= 0) localOrderBook.bids[idx][1] = qty;
            else localOrderBook.bids.push([price, qty]);
          }
        });

        // Apply each ask update
        update.a.forEach(([price, qty]) => {
          if (qty === "0") {
            localOrderBook.asks = localOrderBook.asks.filter((a: string[]) => a[0] !== price);
          } else {
            const idx = localOrderBook.asks.findIndex((a: string[]) => a[0] === price);
            if (idx >= 0) localOrderBook.asks[idx][1] = qty;
            else localOrderBook.asks.push([price, qty]);
          }
        });

        localOrderBook.lastUpdateId = update.u;
      }
    });

    res.json({ message: "Snapshot initialized", lastUpdateId: snapshot.lastUpdateId });
  } catch (err) {
    next(err);
  }
};

// Extra endpoint to fetch the in-memory orderbook
export const getLocalOrderBook = (_req: Request, res: Response) => {
  if (!localOrderBook) {
    return res.status(404).json({ error: "No snapshot yet. Call /binance/init first." });
  }
  res.json(localOrderBook);
};
