type OrderBook = { bids: Map<string, string>; asks: Map<string, string>; symbol: string };

type AggregatedOrder = {
  price: number;
  quantity: number;
};

const DISPLAY_PRICE_DECIMALS = 2;
const MIN_DISPLAY_QUANTITY = 0.0001;
const TOP_LEVEL_LIMIT = 5;

function aggregateOrders(orders: Map<string, string>): AggregatedOrder[] {
  const buckets = new Map<number, number>();

  orders.forEach((rawQty, rawPrice) => {
    const price = Number(rawPrice);
    const quantity = Number(rawQty);

    if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const roundedPrice = Number(price.toFixed(DISPLAY_PRICE_DECIMALS));
    const currentQuantity = buckets.get(roundedPrice) ?? 0;
    buckets.set(roundedPrice, currentQuantity + quantity);
  });

  return Array.from(buckets.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .filter(order => order.quantity >= MIN_DISPLAY_QUANTITY);
}

function formatTopOrders(
  orders: AggregatedOrder[],
  sortFn: (a: AggregatedOrder, b: AggregatedOrder) => number
): string[][] {
  return orders
    .sort(sortFn)
    .slice(0, TOP_LEVEL_LIMIT)
    .map(({ price, quantity }) => [price.toFixed(DISPLAY_PRICE_DECIMALS), quantity.toFixed(8)]);
}

export function formatOrderBook(orderBook: OrderBook) {
  const topBids = formatTopOrders(aggregateOrders(orderBook.bids), (a, b) => b.price - a.price);
  const topAsks = formatTopOrders(aggregateOrders(orderBook.asks), (a, b) => a.price - b.price);

  return {
    type: "orderbook",
    symbol: orderBook.symbol,
    ts: Date.now(),
    bids: topBids,
    asks: topAsks,
  };
}
