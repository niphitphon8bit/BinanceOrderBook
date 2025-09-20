type OrderBook = { bids: string[][]; asks: string[][]; symbol: string };
type Order = [number, number];

function parseOrders(orders: string[][]): Order[] {
  return orders.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
}

function formatTopOrders(
  orders: Order[],
  sortFn: (a: Order, b: Order) => number,
  limit = 5
): string[][] {
  return orders
    .sort(sortFn)
    .slice(0, limit)
    .map(([p, q]) => [p.toFixed(1), q.toFixed(2)]);
}

export function formatOrderBook(orderBook: OrderBook) {
  const topBids = formatTopOrders(parseOrders(orderBook.bids), (a, b) => b[0] - a[0]);
  const topAsks = formatTopOrders(parseOrders(orderBook.asks), (a, b) => a[0] - b[0]);

  return {
    type: "orderbook",
    symbol: orderBook.symbol,
    ts: Date.now(),
    bids: topBids,
    asks: topAsks,
  };
}

