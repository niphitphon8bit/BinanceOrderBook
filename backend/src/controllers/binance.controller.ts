import { Request, Response, NextFunction } from "express";
import { getOrderBook } from "../services/binanceService";
import { subscribeDepth } from "../services/binanceStream";
import { broadcastOrderBook } from "../ws/gateway";

let localOrderBook: any = null;
let wsStarted = false;

export const initOrderBook = async (req: Request, res: Response, next: NextFunction) => {
  // ref: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = req.query.limit ? Number(req.query.limit) : 1000;

    // 1. Fetch snapshot
    const snapshot = await getOrderBook(symbol, limit);
    localOrderBook = { ...snapshot, symbol };

    if (!wsStarted) {
      wsStarted = true;
      subscribeDepth(symbol, (update) => {
        if (!localOrderBook) return;
        if (update.u <= localOrderBook.lastUpdateId) return;
        if (update.U <= localOrderBook.lastUpdateId + 1 && update.u >= localOrderBook.lastUpdateId + 1) {
          // apply updates
          update.b.forEach(([price, quantity]) => {
            if (quantity === "0") {
              localOrderBook.bids = localOrderBook.bids.filter((bid: string[]) => bid[0] !== price);
            } else {
              const idx = localOrderBook.bids.findIndex((bid: string[]) => bid[0] === price);
              if (idx >= 0) localOrderBook.bids[idx][1] = quantity;
              else localOrderBook.bids.push([price, quantity]);
            }
          });
          update.a.forEach(([price, quantity]) => {
            if (quantity === "0") {
              localOrderBook.asks = localOrderBook.asks.filter((ask: string[]) => ask[0] !== price);
            } else {
              const idx = localOrderBook.asks.findIndex((ask: string[]) => ask[0] === price);
              if (idx >= 0) localOrderBook.asks[idx][1] = quantity;
              else localOrderBook.asks.push([price, quantity]);
            }
          });
          localOrderBook.lastUpdateId = update.u;

          // 🚀 Broadcast to frontend clients
          broadcastOrderBook(localOrderBook);
        }
      });
    }

    res.json({ message: "Orderbook snapshot initialized", lastUpdateId: snapshot.lastUpdateId });
  } catch (err) {
    next(err);
  }
};
