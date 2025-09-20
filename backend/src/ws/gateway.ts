import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { formatOrderBook } from "../utils/formatOrderBook";

let wss: WebSocketServer | null = null;

// Called whenever our local orderbook updates
export function broadcastOrderBook(orderBook: any) {
  if (!wss) return;
  const payload = JSON.stringify(formatOrderBook(orderBook));
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// Initialize the WebSocket server
export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server });
  console.log("WebSocket server started");
}
