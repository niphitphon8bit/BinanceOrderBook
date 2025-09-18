import WebSocket from "ws";

interface DepthUpdate {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  U: number;  // First update ID in event
  u: number;  // Final update ID in event
  b: string[][]; // Bids to update
  a: string[][]; // Asks to update
}

export function subscribeDepth(symbol: string, onMessage: (data: DepthUpdate) => void) {
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`;
  const ws = new WebSocket(wsUrl);

  ws.on("open", () => console.log(`📡 Connected to Binance WS: ${symbol}@depth`));
  ws.on("message", (msg) => {
    const data: DepthUpdate = JSON.parse(msg.toString());
    onMessage(data);
  });
  ws.on("error", (err) => console.error("WS error:", err));
  ws.on("close", () => console.log("WS closed"));

  return ws;
}