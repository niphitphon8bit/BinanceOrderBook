import { Request, Response, NextFunction } from "express";
import { createOrderBookManager } from "../services/binanceOrderBook/manager";
import { broadcastOrderBook } from "../ws/gateway";

const manager = createOrderBookManager({
  onBroadcast: broadcastOrderBook,
  onError: (err) => {
    console.error("Order book manager error", err);
  },
});

export const initOrderBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const state = await manager.init(symbol, limit);

    res.json({
      message: "Orderbook snapshot synchronized",
      lastUpdateId: state.lastUpdateId,
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderBookState = (_req: Request, res: Response) => {
  const state = manager.getState();

  if (!state) {
    return res.status(404).json({ message: "Order book not initialized" });
  }

  res.json({
    symbol: state.symbol,
    lastUpdateId: state.lastUpdateId,
    bids: Array.from(state.bids.entries()),
    asks: Array.from(state.asks.entries()),
  });
};
