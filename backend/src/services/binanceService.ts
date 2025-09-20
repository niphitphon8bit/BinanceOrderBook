const BINANCE_API = "https://api.binance.com/api/v3";

export async function getOrderBook(symbol = "BTCUSDT", limit = 1000) {
  const url = `${BINANCE_API}/depth?symbol=${symbol}&limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<{ lastUpdateId: number; bids: string[][]; asks: string[][] }>;
}
