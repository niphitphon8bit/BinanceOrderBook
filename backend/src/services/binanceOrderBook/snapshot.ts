import { getOrderBook } from "../binanceService";
import { createState } from "./logic";
import { OrderBookState } from "./types";

export async function fetchSnapshot(symbol: string, limit: number): Promise<OrderBookState> {
  const snapshot = await getOrderBook(symbol, limit);
  return createState(symbol, snapshot.lastUpdateId, snapshot.bids, snapshot.asks);
}
